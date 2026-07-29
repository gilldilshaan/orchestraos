from __future__ import annotations

import asyncio
import random
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any


class RetryEngine:
    """Handles retry logic for LLM calls with exponential backoff,
    jitter, and configurable strategies per task type."""

    DEFAULT_CONFIG: dict[str, Any] = {
        "max_retries": 3,
        "base_delay": 1.0,
        "max_delay": 30.0,
        "jitter": True,
        "exponential_base": 2.0,
    }

    TASK_RETRY_CONFIGS: dict[str, dict[str, Any]] = {
        "compile": {"max_retries": 2, "base_delay": 1.0},
        "plan": {"max_retries": 3, "base_delay": 1.0},
        "organization": {"max_retries": 2, "base_delay": 1.0},
        "risk": {"max_retries": 2, "base_delay": 1.0},
        "decision": {"max_retries": 3, "base_delay": 1.0},
        "devils_advocate": {"max_retries": 2, "base_delay": 1.5},
        "dashboard": {"max_retries": 2, "base_delay": 1.0},
        "readiness": {"max_retries": 2, "base_delay": 1.0},
        "missing_info": {"max_retries": 2, "base_delay": 1.0},
        "success_probability": {"max_retries": 2, "base_delay": 1.0},
        "resource_gap": {"max_retries": 2, "base_delay": 1.0},
        "dependency_graph": {"max_retries": 2, "base_delay": 1.0},
        "bottleneck": {"max_retries": 2, "base_delay": 1.0},
        "scenario": {"max_retries": 2, "base_delay": 1.0},
        "replan": {"max_retries": 2, "base_delay": 1.0},
        "simulation": {"max_retries": 2, "base_delay": 1.0},
        "executive": {"max_retries": 2, "base_delay": 1.0},
        "specialist": {"max_retries": 2, "base_delay": 1.0},
        "ceo_synthesis": {"max_retries": 2, "base_delay": 1.0},
    }

    def __init__(self) -> None:
        self._attempts: dict[str, list[dict[str, Any]]] = {}

    def get_config(self, task_type: str) -> dict[str, Any]:
        config = dict(self.DEFAULT_CONFIG)
        config.update(self.TASK_RETRY_CONFIGS.get(task_type, {}))
        return config

    def _compute_delay(self, attempt: int, config: dict[str, Any]) -> float:
        delay = config["base_delay"] * (config["exponential_base"] ** attempt)
        delay = min(delay, config["max_delay"])
        if config.get("jitter", True):
            delay *= 0.5 + random.random() * 0.5
        return delay

    def _should_retry(self, attempt: int, config: dict[str, Any], error: Exception) -> bool:
        if attempt >= config["max_retries"] - 1:
            return False
        error_str = str(error).lower()
        if "rate limit" in error_str or "rate_limit" in error_str:
            return True
        if "timeout" in error_str:
            return True
        if "server error" in error_str or "500" in error_str:
            return True
        if "api key" in error_str or "unauthorized" in error_str:
            return False
        if "invalid" in error_str or "bad request" in error_str:
            return False
        return True

    def _record_attempt(
        self, task_id: str, attempt: int, error: str | None, delay: float
    ) -> None:
        if task_id not in self._attempts:
            self._attempts[task_id] = []
        self._attempts[task_id].append({
            "attempt": attempt + 1,
            "error": error,
            "delay": delay,
            "timestamp": datetime.now(UTC).isoformat(),
        })

    def get_attempts(self, task_id: str) -> list[dict[str, Any]]:
        return self._attempts.get(task_id, [])

    async def execute(
        self,
        task_type: str,
        task_id: str,
        fn: Callable[..., Awaitable[Any]],
        *args: Any,
        **kwargs: Any,
    ) -> tuple[Any, list[dict[str, Any]]]:
        config = self.get_config(task_type)
        last_error: Exception | None = None

        for attempt in range(config["max_retries"]):
            try:
                result = await fn(*args, **kwargs)
                self._record_attempt(task_id, attempt, None, 0.0)
                return result, self._attempts.get(task_id, [])
            except Exception as e:
                last_error = e
                delay = self._compute_delay(attempt, config)
                self._record_attempt(task_id, attempt, str(e), delay)

                if not self._should_retry(attempt, config, e):
                    break

                await asyncio.sleep(delay)

        msg = f"All {config['max_retries']} retries exhausted for {task_type}[{task_id}]: {last_error}"
        raise RuntimeError(msg) from last_error
