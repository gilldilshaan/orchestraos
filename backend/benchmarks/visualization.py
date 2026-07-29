"""Visualization module for benchmark results.

Generates comparison charts for all key metrics across baselines.
Requires matplotlib. Charts are saved to the reports/ directory.
"""

from __future__ import annotations

import statistics
from pathlib import Path

from benchmarks.metrics import BenchmarkMetrics

_HAS_MPL = False
try:
    import matplotlib  # noqa: F401
    _HAS_MPL = True
except ImportError:
    pass


def _avg(values: list[float]) -> float:
    return statistics.mean(values) if values else 0.0


def generate_charts(
    metrics: list[BenchmarkMetrics],
    output_dir: str | Path = "reports",
) -> list[Path]:
    """Generate all comparison charts from benchmark metrics.

    Args:
        metrics: List of BenchmarkMetrics from benchmark runs.
        output_dir: Directory to save chart images.

    Returns:
        List of paths to generated chart files.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    generated: list[Path] = []

    if not _HAS_MPL:
        print("  [visualization] matplotlib not installed -- skipping charts")
        return generated

    import matplotlib.pyplot as plt

    # Get baseline order and datasets
    baselines = list({m.baseline_name for m in metrics})
    datasets_list = list({m.dataset_name for m in metrics})

    # Group metrics by baseline then by dataset
    groups: dict[str, dict[str, list[float]]] = {}
    confidences: dict[str, list[float]] = {}
    retries: dict[str, list[float]] = {}
    concurrency: dict[str, list[float]] = {}
    exec_counts: dict[str, list[float]] = {}
    spec_counts: dict[str, list[float]] = {}
    all_latencies: dict[str, list[float]] = {}

    for m in metrics:
        groups.setdefault(m.baseline_name, {}).setdefault(
            m.dataset_name, []
        ).append(m.total_runtime)
        confidences.setdefault(m.baseline_name, []).append(m.decision_confidence)
        retries.setdefault(m.baseline_name, []).append(m.retry_count)
        concurrency.setdefault(m.baseline_name, []).append(m.peak_concurrency)
        exec_counts.setdefault(m.baseline_name, []).append(m.executive_count)
        spec_counts.setdefault(m.baseline_name, []).append(m.specialist_count)
        all_latencies.setdefault(m.baseline_name, []).extend(m._latencies)

    # Chart 1: Runtime Comparison
    fig, ax = plt.subplots(figsize=(10, 5))
    x = range(len(datasets_list))
    width = 0.25

    for i, bn in enumerate(baselines):
        runtimes = [
            _avg(groups.get(bn, {}).get(dn, [0.0]))
            for dn in datasets_list
        ]
        offset = (i - 1) * width
        bars = ax.bar(
            [p + offset for p in x], runtimes, width, label=bn,
        )
        for bar, val in zip(bars, runtimes, strict=False):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.1,
                f"{val:.1f}s",
                ha="center", va="bottom", fontsize=8,
            )

    ax.set_xlabel("Dataset")
    ax.set_ylabel("Total Runtime (s)")
    ax.set_title("Runtime Comparison by Baseline")
    ax.set_xticks(list(x))
    ax.set_xticklabels(datasets_list, rotation=30, ha="right")
    ax.legend()
    fig.tight_layout()
    path = output_path / "chart_runtime_comparison.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    generated.append(path)

    # Chart 2: Organization Size
    fig, ax = plt.subplots(figsize=(10, 5))
    x = range(len(baselines))
    w = 0.35
    exec_avgs = [_avg(exec_counts.get(bn, [0])) for bn in baselines]
    spec_avgs = [_avg(spec_counts.get(bn, [0])) for bn in baselines]
    bars1 = ax.bar([p - w / 2 for p in x], exec_avgs, w, label="Executives")
    bars2 = ax.bar([p + w / 2 for p in x], spec_avgs, w, label="Specialists")
    for bar, val in zip(bars1, exec_avgs, strict=False):
        ax.text(
            bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
            f"{int(val)}", ha="center", fontsize=8,
        )
    for bar, val in zip(bars2, spec_avgs, strict=False):
        ax.text(
            bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
            f"{int(val)}", ha="center", fontsize=8,
        )
    ax.set_xlabel("Baseline")
    ax.set_ylabel("Count")
    ax.set_title("Organization Size by Baseline")
    ax.set_xticks(list(x))
    ax.set_xticklabels(baselines)
    ax.legend()
    fig.tight_layout()
    path = output_path / "chart_org_size.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    generated.append(path)

    # Chart 3: Confidence
    fig, ax = plt.subplots(figsize=(10, 5))
    for i, bn in enumerate(baselines):
        vals = confidences.get(bn, [0.0])
        ax.bar(i, _avg(vals), label=bn)
        ax.text(i, _avg(vals) + 0.01, f"{_avg(vals):.2f}",
                ha="center", fontsize=9)
    ax.set_xlabel("Baseline")
    ax.set_ylabel("Average Confidence")
    ax.set_title("Decision Confidence by Baseline")
    ax.set_xticks(list(range(len(baselines))))
    ax.set_xticklabels(baselines)
    ax.set_ylim(0, 1.05)
    fig.tight_layout()
    path = output_path / "chart_confidence.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    generated.append(path)

    # Chart 4: Retry Count
    fig, ax = plt.subplots(figsize=(10, 5))
    for i, bn in enumerate(baselines):
        vals = retries.get(bn, [0.0])
        ax.bar(i, _avg(vals), label=bn)
        ax.text(i, _avg(vals) + 0.1, f"{_avg(vals):.1f}",
                ha="center", fontsize=9)
    ax.set_xlabel("Baseline")
    ax.set_ylabel("Retry Count")
    ax.set_title("Average Retries by Baseline")
    ax.set_xticks(list(range(len(baselines))))
    ax.set_xticklabels(baselines)
    fig.tight_layout()
    path = output_path / "chart_retries.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    generated.append(path)

    # Chart 5: Parallelism
    fig, ax = plt.subplots(figsize=(10, 5))
    for i, bn in enumerate(baselines):
        vals = concurrency.get(bn, [1.0])
        ax.bar(i, _avg(vals), label=bn)
        ax.text(i, _avg(vals) + 0.2, f"{_avg(vals):.1f}",
                ha="center", fontsize=9)
    ax.set_xlabel("Baseline")
    ax.set_ylabel("Peak Concurrency")
    ax.set_title("Peak Parallelism by Baseline")
    ax.set_xticks(list(range(len(baselines))))
    ax.set_xticklabels(baselines)
    fig.tight_layout()
    path = output_path / "chart_parallelism.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    generated.append(path)

    # Chart 6: Latency Histogram
    fig, ax = plt.subplots(figsize=(10, 5))
    for bn in baselines:
        vals = all_latencies.get(bn, [0.0])
        if vals:
            ax.hist(vals, bins=10, alpha=0.6, label=bn)
    ax.set_xlabel("Latency (s)")
    ax.set_ylabel("Frequency")
    ax.set_title("Per-Call Latency Histogram")
    ax.legend()
    fig.tight_layout()
    path = output_path / "chart_latency_histogram.png"
    fig.savefig(path, dpi=150)
    plt.close(fig)
    generated.append(path)

    print(f"  [visualization] Generated {len(generated)} charts in {output_dir}")
    return generated


def print_summary_table(metrics: list[BenchmarkMetrics]) -> None:
    """Print a formatted summary table of aggregated results."""
    if not metrics:
        print("No metrics to display.")
        return

    baselines = list({m.baseline_name for m in metrics})
    dataset_names = sorted({m.dataset_name for m in metrics})

    groups: dict[str, dict[str, list[float]]] = {}
    for m in metrics:
        groups.setdefault(m.baseline_name, {}).setdefault(
            m.dataset_name, []
        ).append(m.total_runtime)

    print()
    header = f"{'Baseline':<15}" + "".join(
        f"{dn:>15}" for dn in dataset_names
    )
    print(header)
    print("-" * len(header))
    for bn in baselines:
        row = f"{bn:<15}"
        for dn in dataset_names:
            vals = groups.get(bn, {}).get(dn, [])
            row += f"{_avg(vals):>15.2f}"
        print(row)
    print()
