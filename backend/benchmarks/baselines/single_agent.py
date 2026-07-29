from __future__ import annotations

import time as _time

from app.kernel.ai_kernel import AIKernel
from benchmarks.baselines import Baseline
from benchmarks.metrics import BenchmarkMetrics

_FLAT_PROMPT = (
    "You are a strategy consultant. Analyze this business objective and "
    "produce a complete strategic analysis covering all aspects.\n\n"
    "Objective: {{ objective.raw }}\n\n"
    "Output JSON ONLY with these exact fields:\n"
    "- mission: core mission statement (string)\n"
    "- vision: long-term vision (string)\n"
    "- business_type: type of business initiative (string)\n"
    "- industry: target industry (string)\n"
    "- roadmap: {phases: [{phase_number: int, name: string, "
    "duration_months: int, milestones: [string]}]}\n"
    "- timeline: {total_months: int, start_date: string}\n"
    "- budget: {total: float, currency: string}\n"
    "- departments: [{name: string, description: string, "
    "head_count: int}]\n"
    "- risks: [{title: string, description: string, category: string, "
    "probability: float, impact: float, risk_level: string, "
    "mitigation: string}]\n"
    "- recommendation: recommended strategic approach (string)\n"
    "- reasoning: detailed reasoning (string)\n"
    "- confidence: 0.0 to 1.0\n"
    "- risk_level: low, medium, high, or critical\n"
    "- key_stakeholders: [{name: string, role: string}]\n\n"
    "Use null for genuinely unknown values. Ensure valid JSON."
)


class SingleAgentBaseline(Baseline):
    """Baseline that uses a single flat AI prompt for everything.

    No task decomposition, no specialized agents, no parallel execution.
    Represents the simplest possible approach — one LLM call.
    """

    def __init__(self, kernel: AIKernel) -> None:
        super().__init__(kernel)
        self._prompt = _FLAT_PROMPT

    async def run(self, objective_text: str, dataset_name: str, iteration: int) -> BenchmarkMetrics:
        start = _time.monotonic()

        result = await self._kernel.run(
            task_type="compile",
            prompt_text=self._prompt,
            context={"objective": {"raw": objective_text}},
            temperature=0.3,
            use_cache=False,
        )

        elapsed = _time.monotonic() - start

        stats = self._kernel.get_stats()
        obs = stats.get("observability", {})
        tokens = stats.get("token_usage", {}).get("total", 0)
        calls = obs.get("total_calls", 0)

        confidence = result.get("confidence", 0.0) if isinstance(result, dict) else 0.0

        return BenchmarkMetrics(
            baseline_name="SingleAgent",
            dataset_name=dataset_name,
            iteration=iteration,
            planning_latency=0.0,
            execution_latency=elapsed,
            total_runtime=elapsed,
            parallel_speedup=1.0,
            peak_concurrency=1,
            avg_concurrency=1.0,
            node_count=1,
            executive_count=0,
            specialist_count=0,
            retry_count=obs.get("failed", 0),
            failure_recovery=True,
            conflict_count=0,
            decision_confidence=confidence,
            health_score=confidence,
            avg_token_usage=tokens // max(calls, 1),
            task_success_rate=1.0 if "mission" in (result or {}) else 0.0,
            _event_count=calls,
            _latencies=[obs.get("avg_latency_ms", 0) / 1000.0],
        )
