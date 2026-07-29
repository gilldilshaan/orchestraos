"""Benchmark Runner — compares SingleAgent, FixedTeam, and OrchestraOS.

Usage:
    python -m benchmarks.benchmark_runner [--iterations 3]
        [--datasets datasets/sample_objectives.json]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time as _time
from pathlib import Path
from typing import Any

from app.kernel import ai_kernel
from benchmarks.baselines.fixed_team import FixedTeamBaseline
from benchmarks.baselines.orchestraos import OrchestraOSBaseline
from benchmarks.baselines.single_agent import SingleAgentBaseline
from benchmarks.metrics import (
    BenchmarkMetrics,
    write_csv_report,
    write_json_report,
    write_markdown_summary,
)


def _load_datasets(path: str | Path) -> list[dict[str, Any]]:
    path = Path(path)
    if not path.exists():
        msg = f"Datasets file not found: {path}"
        raise FileNotFoundError(msg)
    with open(path) as f:
        return json.load(f)


def _clean_kernel() -> None:
    ai_kernel.reset()


def run_benchmarks(
    datasets_path: str | Path = "datasets/sample_objectives.json",
    iterations: int = 3,
    output_dir: str | Path = "reports",
    baselines: list[str] | None = None,
) -> list[BenchmarkMetrics]:
    """Run all benchmark baselines against all datasets.

    Args:
        datasets_path: Path to JSON file with sample objectives.
        iterations: Number of times to repeat each baseline per dataset.
        output_dir: Directory for generated report files.
        baselines: Which baselines to run (default: all three).

    Returns:
        List of BenchmarkMetrics for all runs.
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print("=" * 72)
    print("  OrchestraOS Benchmark Runner")
    print("=" * 72)

    datasets = _load_datasets(datasets_path)
    print(f"\n  Datasets: {len(datasets)}")
    for ds in datasets:
        print(f"    - {ds['name']} ({ds['complexity']} complexity)")

    print(f"  Iterations per baseline: {iterations}")
    print()

    all_metrics: list[BenchmarkMetrics] = []
    baseline_instances: dict[str, Any] = {}

    kernel = ai_kernel
    if baselines is None or "SingleAgent" in baselines:
        baseline_instances["SingleAgent"] = SingleAgentBaseline(kernel)
    if baselines is None or "FixedTeam" in baselines:
        baseline_instances["FixedTeam"] = FixedTeamBaseline(kernel)
    if baselines is None or "OrchestraOS" in baselines:
        baseline_instances["OrchestraOS"] = OrchestraOSBaseline(kernel)

    total_runs = len(baseline_instances) * len(datasets) * iterations
    run_count = 0

    for dataset in datasets:
        for bname, baseline in baseline_instances.items():
            for i in range(iterations):
                run_count += 1
                label = (
                    f"[{run_count}/{total_runs}] {bname} :: "
                    f"{dataset['name']} (#{i + 1})"
                )
                print(f"  {label} ...", end=" ", flush=True)

                try:
                    _clean_kernel()

                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        metrics = loop.run_until_complete(
                            baseline.run(
                                objective_text=dataset["raw"],
                                dataset_name=dataset["name"],
                                iteration=i,
                            )
                        )
                    finally:
                        loop.close()

                    all_metrics.append(metrics)
                    print(f"OK ({metrics.total_runtime:.2f}s)")
                except Exception as e:
                    print(f"FAILED ({e})")
                    print(
                        f"    Skipping {bname}/{dataset['name']} "
                        f"iteration {i + 1}"
                    )

    print()
    print(f"  Completed: {len(all_metrics)} / {total_runs} runs")

    # Generate reports
    stamp = int(_time.time())
    csv_path = output_path / f"benchmark_results_{stamp}.csv"
    json_path = output_path / f"benchmark_results_{stamp}.json"
    md_path = output_path / f"benchmark_summary_{stamp}.md"

    write_csv_report(all_metrics, csv_path)
    write_json_report(all_metrics, json_path)
    write_markdown_summary(all_metrics, md_path)

    print("\n  Reports:")
    print(f"    CSV:  {csv_path}")
    print(f"    JSON: {json_path}")
    print(f"    MD:   {md_path}")

    return all_metrics


def main() -> None:
    parser = argparse.ArgumentParser(
        description="OrchestraOS Benchmark Runner",
    )
    parser.add_argument(
        "--iterations", type=int, default=3,
        help="Number of iterations per baseline + dataset (default: 3)",
    )
    parser.add_argument(
        "--datasets", type=str, default="datasets/sample_objectives.json",
        help="Path to datasets JSON (default: datasets/sample_objectives.json)",
    )
    parser.add_argument(
        "--output", type=str, default="reports",
        help="Output directory for reports (default: reports)",
    )
    parser.add_argument(
        "--baselines", type=str, nargs="+",
        choices=["SingleAgent", "FixedTeam", "OrchestraOS"],
        default=None,
        help="Which baselines to run (default: all)",
    )
    args = parser.parse_args()

    datasets_path = Path(__file__).parent / args.datasets
    output_path = Path(__file__).parent / args.output

    run_benchmarks(
        datasets_path=datasets_path,
        iterations=args.iterations,
        output_dir=output_path,
        baselines=args.baselines,
    )


if __name__ == "__main__":
    main()
