from __future__ import annotations

import csv
import json
import statistics
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.kernel.event_system import EventTimeline, RunMetrics


@dataclass
class BenchmarkMetrics:
    """All metrics collected for a single benchmark run."""

    # Identification
    baseline_name: str = ""
    dataset_name: str = ""
    iteration: int = 0
    timestamp: str = ""

    # Latency (seconds)
    planning_latency: float = 0.0
    execution_latency: float = 0.0
    total_runtime: float = 0.0

    # Parallelism
    parallel_speedup: float = 1.0
    peak_concurrency: int = 1
    avg_concurrency: float = 1.0

    # Organization
    node_count: int = 0
    executive_count: int = 0
    specialist_count: int = 0

    # Reliability
    retry_count: int = 0
    failure_recovery: bool = True
    conflict_count: int = 0

    # Quality
    decision_confidence: float = 0.0
    health_score: float = 0.0

    # Resource usage
    avg_token_usage: int = 0

    # Success
    task_success_rate: float = 1.0

    # Raw data (not exported to CSV by default)
    _event_count: int = 0
    _latencies: list[float] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "baseline_name": self.baseline_name,
            "dataset_name": self.dataset_name,
            "iteration": self.iteration,
            "timestamp": self.timestamp,
            "planning_latency_s": round(self.planning_latency, 4),
            "execution_latency_s": round(self.execution_latency, 4),
            "total_runtime_s": round(self.total_runtime, 4),
            "parallel_speedup": round(self.parallel_speedup, 4),
            "peak_concurrency": self.peak_concurrency,
            "avg_concurrency": round(self.avg_concurrency, 2),
            "node_count": self.node_count,
            "executive_count": self.executive_count,
            "specialist_count": self.specialist_count,
            "retry_count": self.retry_count,
            "failure_recovery": self.failure_recovery,
            "conflict_count": self.conflict_count,
            "decision_confidence": round(self.decision_confidence, 4),
            "health_score": round(self.health_score, 4),
            "avg_token_usage": self.avg_token_usage,
            "task_success_rate": round(self.task_success_rate, 4),
        }


class MetricsCollector:
    """Collects benchmark metrics by tracking AIKernel observability data."""

    def __init__(self) -> None:
        self._timeline = EventTimeline()
        self._run_metrics = RunMetrics()
        self._latencies: list[float] = []
        self._concurrency_tracker: dict[str, float] = {}
        self._peak_concurrency = 0
        self._concurrency_samples: list[int] = []
        self._conflicts = 0
        self._confidences: list[float] = []
        self._tokens: list[int] = []
        self._task_results: list[bool] = []
        self._retries = 0

    def finalize(
        self,
        baseline_name: str = "",
        dataset_name: str = "",
        iteration: int = 0,
    ) -> BenchmarkMetrics:
        total_runtime = self._timeline.duration()
        execution_count = len(self._task_results)
        successes = sum(1 for r in self._task_results if r)
        success_rate = successes / execution_count if execution_count > 0 else 1.0
        avg_conf = statistics.mean(self._confidences) if self._confidences else 0.0
        avg_val = (
            statistics.mean(self._concurrency_samples)
            if self._concurrency_samples else 1.0
        )

        return BenchmarkMetrics(
            baseline_name=baseline_name,
            dataset_name=dataset_name,
            iteration=iteration,
            timestamp=datetime.now(UTC).isoformat(),
            execution_latency=total_runtime,
            total_runtime=total_runtime,
            peak_concurrency=self._peak_concurrency,
            avg_concurrency=avg_val,
            retry_count=self._retries,
            conflict_count=self._conflicts,
            decision_confidence=avg_conf,
            avg_token_usage=int(statistics.mean(self._tokens)) if self._tokens else 0,
            task_success_rate=success_rate,
            _event_count=len(self._timeline.get_events()),
            _latencies=list(self._latencies),
        )


# ── Export ──────────────────────────────────────────────────────────────


def write_csv_report(metrics: Sequence[BenchmarkMetrics], path: str | Path) -> Path:
    path = Path(path)
    if not metrics:
        return path
    fieldnames = list(metrics[0].to_dict().keys())
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for m in metrics:
            writer.writerow(m.to_dict())
    return path


def write_json_report(metrics: Sequence[BenchmarkMetrics], path: str | Path) -> Path:
    path = Path(path)
    data = {
        "generated_at": datetime.now(UTC).isoformat(),
        "total_runs": len(metrics),
        "results": [m.to_dict() for m in metrics],
    }
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return path


def write_markdown_summary(
    metrics: Sequence[BenchmarkMetrics],
    path: str | Path,
) -> Path:
    path = Path(path)
    if not metrics:
        return path

    groups: dict[str, list[BenchmarkMetrics]] = {}
    for m in metrics:
        groups.setdefault(m.baseline_name, []).append(m)

    lines: list[str] = []
    lines.append("# Benchmark Results")
    lines.append(f"\nGenerated: {datetime.now(UTC).isoformat()}")
    lines.append(f"Total runs: {len(metrics)}\n")

    for baseline, group in sorted(groups.items()):
        values = [m.to_dict() for m in group]
        avg = {
            k: statistics.mean([v[k] for v in values])
            for k in values[0]
            if isinstance(values[0][k], (int, float))
        }
        lines.append(f"## {baseline}")
        lines.append(f"\nRuns: {len(group)}")
        lines.append("\n| Metric | Average |")
        lines.append("|--------|--------|")
        for k, v in sorted(avg.items()):
            lines.append(f"| {k} | {v:.4f} |")
        lines.append("")

    with open(path, "w") as f:
        f.write("\n".join(lines))
    return path
