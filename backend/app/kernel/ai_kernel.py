from __future__ import annotations

import hashlib
import time
from typing import Any

from pydantic import BaseModel

from app.kernel.cache_manager import CacheManager
from app.kernel.context_manager import ContextManager
from app.kernel.event_bus import EventBus
from app.kernel.model_router import ModelRouter
from app.kernel.observability import CostTracker, ObservabilityTracker, TokenTracker
from app.kernel.output_validator import OutputValidator
from app.kernel.prompt_manager import PromptManager
from app.kernel.retry_engine import RetryEngine
from app.kernel.state_machine import WorkflowStateMachine
from app.llm.client import llm_client


class AIKernel:
    """Central AI orchestration layer.

    Every agent calls `ai_kernel.run()` instead of directly calling
    `llm_client.generate_structured()`. The kernel handles:
      - Prompt loading and rendering (versioned templates)
      - Model routing (provider selection per task type)
      - Context management (shared ExecutionContext)
      - Output validation (JSON repair → Pydantic → business rules)
      - Retry logic with exponential backoff
      - Caching (deduplication of identical requests)
      - Observability (latency, tokens, cost tracking)
      - Event publishing (for inter-agent communication)
    """

    def __init__(self) -> None:
        self.prompt_manager = PromptManager()
        self.model_router = ModelRouter()
        self.context_manager = ContextManager()
        self.output_validator = OutputValidator()
        self.retry_engine = RetryEngine()
        self.cache_manager = CacheManager()
        self.observability = ObservabilityTracker()
        self.token_tracker = TokenTracker()
        self.cost_tracker = CostTracker()
        self.event_bus = EventBus()
        self.state_machine = WorkflowStateMachine()

    async def run(
        self,
        task_type: str,
        prompt_text: str | None = None,
        prompt_template: str | None = None,
        context: dict[str, Any] | None = None,
        schema: type[BaseModel] | None = None,
        required_fields: list[str] | None = None,
        field_defaults: dict[str, Any] | None = None,
        business_rules: list[tuple[str, Any, str]] | None = None,
        temperature: float | None = None,
        use_cache: bool = True,
        system_prompt: str | None = None,
    ) -> dict[str, Any]:
        start_time = time.monotonic()
        retry_count = 0

        # 1. Resolve prompt
        if prompt_template:
            resolved_prompt = self.prompt_manager.render(
                prompt_template, context or {}
            )
        elif prompt_text:
            resolved_prompt = prompt_text
        else:
            msg = "Either prompt_text or prompt_template is required"
            raise ValueError(msg)

        prompt_version = prompt_template or "inline"

        # 2. Check cache
        if use_cache:
            cached = self.cache_manager.get(task_type, resolved_prompt, context)
            if cached is not None:
                elapsed_ms = (time.monotonic() - start_time) * 1000
                self.observability.record_call(
                    task_type=task_type,
                    model="cache",
                    prompt_version=prompt_version,
                    latency_ms=elapsed_ms,
                    success=True,
                    cached=True,
                )
                return cached

        # 3. Determine model route
        route = self.model_router.get_route(task_type)
        model = route.get("model", "gpt-4o")
        effective_temperature = temperature if temperature is not None else route.get("temperature", 0.3)

        # 4. Execute with retry
        async def _call_llm() -> str:
            return await llm_client.generate(
                prompt=resolved_prompt,
                system_prompt=system_prompt,
                temperature=effective_temperature,
            )

        try:
            task_id = f"{task_type}:{hashlib.md5(resolved_prompt.encode()).hexdigest()[:12]}"
            raw_output, attempts = await self.retry_engine.execute(
                task_type, task_id, _call_llm
            )
            retry_count = len([a for a in attempts if a.get("error")])
        except Exception as e:
            elapsed_ms = (time.monotonic() - start_time) * 1000
            self.observability.record_call(
                task_type=task_type,
                model=model,
                prompt_version=prompt_version,
                latency_ms=elapsed_ms,
                success=False,
                failure_reason=str(e),
                retry_count=retry_count,
            )
            raise

        # 5. Validate and repair output
        validated = self.output_validator.validate_and_repair(
            raw=raw_output,
            schema=schema,
            required_fields=required_fields,
            field_defaults=field_defaults,
            business_rules=business_rules,
        )

        # 6. Cache the result
        if use_cache:
            self.cache_manager.set(task_type, resolved_prompt, validated, context)

        # 7. Track observability
        elapsed_ms = (time.monotonic() - start_time) * 1000
        input_tokens = len(resolved_prompt) // 4
        output_tokens = len(raw_output) // 4

        self.observability.record_call(
            task_type=task_type,
            model=model,
            prompt_version=prompt_version,
            latency_ms=elapsed_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            retry_count=retry_count,
            success=True,
        )
        self.token_tracker.add(input_tokens, output_tokens)

        cost = self.observability.estimate_cost(model, input_tokens, output_tokens)
        self.cost_tracker.add(model, cost)

        return validated

    def get_stats(self) -> dict[str, Any]:
        return {
            "observability": self.observability.get_session_stats(),
            "cache": self.cache_manager.stats(),
            "token_usage": {
                "total_input": self.token_tracker.total_input,
                "total_output": self.token_tracker.total_output,
                "total": self.token_tracker.total,
            },
            "total_cost": self.cost_tracker.total_cost,
            "cost_by_model": self.cost_tracker.cost_by_model,
        }

    def reset(self) -> None:
        self.observability.clear()
        self.token_tracker.reset()
        self.cost_tracker.reset()
        self.cache_manager.clear()
        self.context_manager.clear()
        self.event_bus.clear()
