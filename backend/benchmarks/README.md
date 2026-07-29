# OrchestraOS Benchmarking Framework

Compare three agent architectures using reproducible benchmarks.

## Architectures

| Baseline | Approach | Decomposition | Parallelism |
|----------|----------|---------------|-------------|
| **SingleAgent** | Flat prompt — one AI call does everything | None | None |
| **FixedTeam** | Sequential specialized agents (compile → plan → org → risk → decision) | Fixed roles | None |
| **OrchestraOS** | Dynamic organization (intelligence → CEO → org gen → executives + specialists → synthesis) | Dynamic per objective | Concurrent executives and specialists |

## Directory Structure

```
benchmarks/
├── benchmark_runner.py    # Entry point: orchestrates runs, generates reports
├── metrics.py             # BenchmarkMetrics dataclass + CSV/JSON/MD export
├── visualization.py       # Chart generation (matplotlib) + summary table
├── baselines/
│   ├── __init__.py        # Baseline ABC
│   ├── single_agent.py    # SingleAgentBaseline
│   ├── fixed_team.py      # FixedTeamBaseline
│   └── orchestraos.py     # OrchestraOSBaseline
├── datasets/
│   └── sample_objectives.json  # 5 test objectives (low/medium/high complexity)
├── reports/               # Generated output directory
└── README.md
```

## Quick Start

```bash
cd backend

# Install matplotlib for charts (optional)
pip install matplotlib

# Run default benchmark (3 iterations × 3 baselines × 5 datasets)
python -m benchmarks.benchmark_runner

# Custom iterations
python -m benchmarks.benchmark_runner --iterations 5

# Run specific baselines only
python -m benchmarks.benchmark_runner --baselines SingleAgent OrchestraOS

# Custom output directory
python -m benchmarks.benchmark_runner --output reports/my_benchmark
```

## Metrics Collected

| Category | Metrics |
|----------|---------|
| Latency | Planning time, execution time, total runtime |
| Parallelism | Peak concurrency, average concurrency, parallel speedup |
| Organization | Node count, executive count, specialist count |
| Reliability | Retry count, failure recovery, conflict count |
| Quality | Decision confidence, health score, task success rate |
| Resources | Average token usage, event count |

## Reports

Each benchmark run generates three reports in `reports/`:

1. **CSV** — Raw metrics per run (for spreadsheet analysis)
2. **JSON** — Structured dump (for programmatic consumption)
3. **Markdown** — Summary with averages per baseline

## Charts (requires matplotlib)

| Chart | Description |
|-------|-------------|
| `chart_runtime_comparison.png` | Total runtime by baseline × dataset |
| `chart_org_size.png` | Executive/specialist counts by baseline |
| `chart_confidence.png` | Average decision confidence |
| `chart_retries.png` | Average retries per baseline |
| `chart_parallelism.png` | Peak concurrency |
| `chart_latency_histogram.png` | Per-call latency distribution |

## Design Principles

1. **No runtime modification** — benchmarks import from the existing codebase without changing it
2. **Telemetry only** — metrics use `TelemetryBus` and `AIKernel.observability`
3. **Reproducible** — controlled iterations, no API keys required (uses fallback mode), fixed datasets
4. **Additive** — zero changes to `app/`, `tests/`, or any production code
5. **Minimal dependencies** — only needs OrchestraOS backend + optional `matplotlib`
