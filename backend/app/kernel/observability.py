from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, ClassVar


class ObservabilityTracker:
    """Tracks AI operations for debugging, monitoring, and cost analysis.

    Records per-call metrics: model, latency, prompt version, tokens,
    estimated cost, retry count, and failure reason.
    """

    ESTIMATED_COST_PER_1K_TOKENS: ClassVar[dict[str, dict[str, float]]] = {
        "gpt-4o": {"input": 0.01, "output": 0.03},
        "gpt-4o-mini": {"input": 0.0015, "output": 0.006},
        "claude-3-opus": {"input": 0.015, "output": 0.075},
        "claude-3-sonnet": {"input": 0.003, "output": 0.015},
        "gemini-1.5-pro": {"input": 0.0035, "output": 0.0105},
        "fallback": {"input": 0.0, "output": 0.0},
    }

    def __init__(self) -> None:
        self._records: list[dict[str, Any]] = []
        self._session_start = datetime.now(UTC)

    def record_call(
        self,
        task_type: str,
        model: str,
        prompt_version: str,
        latency_ms: float,
        input_tokens: int = 0,
        output_tokens: int = 0,
        retry_count: int = 0,
        success: bool = True,
        failure_reason: str | None = None,
        cached: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        estimated_cost = self._estimate_cost(model, input_tokens, output_tokens)

        record = {
            "timestamp": datetime.now(UTC).isoformat(),
            "task_type": task_type,
            "model": model,
            "prompt_version": prompt_version,
            "latency_ms": latency_ms,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost": estimated_cost,
            "retry_count": retry_count,
            "success": success,
            "failure_reason": failure_reason,
            "cached": cached,
            **(metadata or {}),
        }
        self._records.append(record)
        return record

    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        return self._estimate_cost(model, input_tokens, output_tokens)

    def _estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        rates = self.ESTIMATED_COST_PER_1K_TOKENS.get(
            model, {"input": 0.0, "output": 0.0}
        )
        input_cost = (input_tokens / 1000) * rates["input"]
        output_cost = (output_tokens / 1000) * rates["output"]
        return round(input_cost + output_cost, 6)

    def get_session_stats(self) -> dict[str, Any]:
        total_calls = len(self._records)
        successful = sum(1 for r in self._records if r["success"])
        failed = total_calls - successful
        cached = sum(1 for r in self._records if r["cached"])
        total_cost = sum(r["estimated_cost"] for r in self._records)
        latencies = [r["latency_ms"] for r in self._records if r["success"]]

        session_duration = datetime.now(UTC) - self._session_start

        return {
            "session_duration_seconds": session_duration.total_seconds(),
            "total_calls": total_calls,
            "successful": successful,
            "failed": failed,
            "cached": cached,
            "total_estimated_cost": round(total_cost, 6),
            "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0.0,
            "max_latency_ms": max(latencies) if latencies else 0.0,
            "by_task": self._group_by_task(),
        }

    def _group_by_task(self) -> dict[str, Any]:
        groups: dict[str, dict[str, Any]] = {}
        for r in self._records:
            task = r["task_type"]
            if task not in groups:
                groups[task] = {"count": 0, "failures": 0, "total_cost": 0.0, "latencies": []}
            groups[task]["count"] += 1
            if not r["success"]:
                groups[task]["failures"] += 1
            groups[task]["total_cost"] += r["estimated_cost"]
            groups[task]["latencies"].append(r["latency_ms"])

        return {
            task: {
                "count": data["count"],
                "failures": data["failures"],
                "total_cost": round(data["total_cost"], 6),
                "avg_latency_ms": (
                    round(sum(data["latencies"]) / len(data["latencies"]), 2)
                    if data["latencies"]
                    else 0.0
                ),
            }
            for task, data in groups.items()
        }

    def get_recent_calls(self, limit: int = 50) -> list[dict[str, Any]]:
        return self._records[-limit:]

    def clear(self) -> None:
        self._records.clear()
        self._session_start = datetime.now(UTC)


class TokenTracker:
    def __init__(self) -> None:
        self._total_input = 0
        self._total_output = 0

    def add(self, input_tokens: int, output_tokens: int) -> None:
        self._total_input += input_tokens
        self._total_output += output_tokens

    @property
    def total_input(self) -> int:
        return self._total_input

    @property
    def total_output(self) -> int:
        return self._total_output

    @property
    def total(self) -> int:
        return self._total_input + self._total_output

    def reset(self) -> None:
        self._total_input = 0
        self._total_output = 0


class CostTracker:
    def __init__(self) -> None:
        self._total_cost = 0.0
        self._cost_by_model: dict[str, float] = {}

    def add(self, model: str, cost: float) -> None:
        self._total_cost += cost
        self._cost_by_model[model] = self._cost_by_model.get(model, 0.0) + cost

    @property
    def total_cost(self) -> float:
        return round(self._total_cost, 6)

    @property
    def cost_by_model(self) -> dict[str, float]:
        return {k: round(v, 6) for k, v in self._cost_by_model.items()}

    def reset(self) -> None:
        self._total_cost = 0.0
        self._cost_by_model.clear()
