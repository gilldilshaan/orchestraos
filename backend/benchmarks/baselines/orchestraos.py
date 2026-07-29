from __future__ import annotations

import asyncio
import time as _time
from typing import Any

from app.kernel.ai_kernel import AIKernel
from benchmarks.baselines import Baseline
from benchmarks.metrics import BenchmarkMetrics


class OrchestraOSBaseline(Baseline):
    """Baseline using the OrchestraOS dynamic organization architecture.

    Steps:
      1. Intelligence — analyze objective, estimate team structure
      2. CEO Analysis — determine domain, complexity, expertise needed
      3. Organization Generator — design the company (executives + specialists)
      4. Executive Loop — run each executive (concurrent if parallel dept)
         - Each executive calls ai_kernel.run() with their role context
         - If executive requires specialists, those run concurrently
      5. Synthesis — consolidate all executive reports into final output
    """

    def __init__(self, kernel: AIKernel) -> None:
        super().__init__(kernel)

    async def run(self, objective_text: str, dataset_name: str, iteration: int) -> BenchmarkMetrics:
        total_start = _time.monotonic()
        context: dict[str, Any] = {"objective": {"raw": objective_text}}
        latencies: list[float] = []

        # Step 1: Intelligence
        t0 = _time.monotonic()
        intelligence = await self._kernel.run(
            task_type="intelligence",
            prompt_template="intelligence_v1.md",
            context=context,
            temperature=0.3,
            use_cache=False,
        )
        latencies.append(_time.monotonic() - t0)
        context["intelligence"] = intelligence

        # Step 2: CEO Analysis
        t0 = _time.monotonic()
        ceo_analysis = await self._kernel.run(
            task_type="ceo_analysis",
            prompt_template="ceo_v1.md",
            context=context,
            temperature=0.4,
            use_cache=False,
        )
        latencies.append(_time.monotonic() - t0)
        context["ceo_analysis"] = ceo_analysis

        # Step 3: Organization Generator
        t0 = _time.monotonic()
        org_structure = await self._kernel.run(
            task_type="organization_generator",
            prompt_template="organization_generator_v1.md",
            context={
                "objective": {"raw": objective_text},
                "intelligence": {
                    "domain": intelligence.get("domain", ""),
                    "complexity": intelligence.get("complexity", "medium"),
                    "required_capabilities": intelligence.get("required_capabilities", []),
                    "estimated_team_size": intelligence.get("estimated_team_size", 5),
                },
            },
            temperature=0.4,
            use_cache=False,
        )
        latencies.append(_time.monotonic() - t0)
        context["org_structure"] = org_structure

        executives_raw = org_structure.get("executives", [])
        num_execs = len(executives_raw)
        num_specialists = 0

        # Step 4: Executive Loop
        t_exec_start = _time.monotonic()
        concurrency_samples: list[int] = []
        _concurrency_tracker: set[str] = set()

        async def _run_executive(ex: dict[str, Any]) -> dict[str, Any]:
            nonlocal num_specialists
            title = ex.get("title", "Executive")
            _concurrency_tracker.add(title)
            concurrency_samples.append(len(_concurrency_tracker))

            exec_output = await self._kernel.run(
                task_type="executive",
                prompt_template="executive_v1.md",
                context={
                    "title": title,
                    "purpose": ex.get("purpose", ""),
                    "responsibilities": ex.get("responsibilities", []),
                    "company_name": org_structure.get("company_name", "Company"),
                    "industry": org_structure.get("industry", ""),
                    "objective": {"raw": objective_text},
                },
                temperature=0.4,
                use_cache=False,
            )

            needs_specialists = ex.get("requires_specialists", False)
            specialists_raw = ex.get("required_specialists", []) if needs_specialists else []
            spec_results: list[dict[str, Any]] = []

            if specialists_raw and isinstance(specialists_raw, list):
                async def _run_specialist(spec_title: str) -> dict[str, Any]:
                    nonlocal num_specialists
                    num_specialists += 1
                    _concurrency_tracker.add(f"spec:{spec_title}")
                    concurrency_samples.append(len(_concurrency_tracker))
                    result = await self._kernel.run(
                        task_type="specialist",
                        prompt_template="specialist_v1.md",
                        context={
                            "title": spec_title,
                            "purpose": f"Support {title} in {ex.get('purpose', '')}",
                            "responsibilities": [],
                            "company_name": org_structure.get("company_name", "Company"),
                            "industry": org_structure.get("industry", ""),
                            "parent_title": title,
                            "executive_context": exec_output.get("summary", ""),
                            "objective": {"raw": objective_text},
                        },
                        temperature=0.3,
                        use_cache=False,
                    )
                    _concurrency_tracker.discard(f"spec:{spec_title}")
                    concurrency_samples.append(len(_concurrency_tracker))
                    return {"title": spec_title, "output": result}

                spec_results = await asyncio.gather(
                    *[_run_specialist(s) for s in specialists_raw],
                    return_exceptions=True,
                )

            _concurrency_tracker.discard(title)
            concurrency_samples.append(len(_concurrency_tracker))
            failed_specs = sum(1 for r in spec_results if isinstance(r, Exception))
            return {
                "title": title,
                "output": exec_output,
                "specialists": [r for r in spec_results if isinstance(r, dict)],
                "failed_specialists": failed_specs,
            }

        exec_results = await asyncio.gather(
            *[_run_executive(ex) for ex in executives_raw],
            return_exceptions=True,
        )

        successful_execs = [r for r in exec_results if isinstance(r, dict)]
        failed_execs = [r for r in exec_results if isinstance(r, Exception)]
        peak_concurrency = max(concurrency_samples) if concurrency_samples else 1
        total = sum(concurrency_samples)
        avg_val = total / len(concurrency_samples) if concurrency_samples else 1.0

        exec_latency = _time.monotonic() - t_exec_start

        # Step 5: Synthesis
        t0 = _time.monotonic()
        summaries = "\n\n".join(
            f"{e['title']}: {e['output'].get('summary', 'completed')}"
            for e in successful_execs
        )

        synthesis = await self._kernel.run(
            task_type="ceo_synthesis",
            prompt_text=(
                "You are the CEO of {{ company_name }}, "
                "in the {{ industry }} industry.\n\n"
                "Objective: {{ objective.raw }}\n\n"
                "Your executive team completed their work:\n\n"
                "{{ executive_summaries }}\n\n"
                "Synthesize these into a final strategic report.\n\n"
                "Output JSON ONLY:\n"
                "- final_summary: overall assessment (string)\n"
                "- key_achievements: list of achievements (list of strings)\n"
                "- strategic_recommendations: list of recommendations "
                "(list of strings)\n"
                "- risks_and_mitigations: list of risk descriptions "
                "(list of strings)\n"
                "- confidence: 0.0 to 1.0\n"
                "- next_steps: list of next actions (list of strings)"
            ),
            context={
                "company_name": org_structure.get("company_name", "Company"),
                "industry": org_structure.get("industry", ""),
                "objective": {"raw": objective_text},
                "executive_summaries": summaries,
            },
            temperature=0.4,
            use_cache=False,
        )
        _time.monotonic() - t0  # synthesis latency

        total_elapsed = _time.monotonic() - total_start

        # Collect metrics
        stats = self._kernel.get_stats()
        obs = stats.get("observability", {})
        total_tokens = stats.get("token_usage", {}).get("total", 0)
        calls = obs.get("total_calls", 0)
        retries = obs.get("failed", 0)

        confidences = [
            s.get("output", {}).get("confidence", 0.0)
            if isinstance(s, dict) and "output" in s else 0.0
            for s in successful_execs
        ]
        if isinstance(synthesis, dict) and synthesis.get("confidence"):
            confidences.append(synthesis.get("confidence", 0.0))
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return BenchmarkMetrics(
            baseline_name="OrchestraOS",
            dataset_name=dataset_name,
            iteration=iteration,
            planning_latency=latencies[0] if latencies else 0.0,
            execution_latency=exec_latency,
            total_runtime=total_elapsed,
            parallel_speedup=peak_concurrency,
            peak_concurrency=peak_concurrency,
            avg_concurrency=avg_val,
            node_count=3 + num_execs + num_specialists + 1,
            executive_count=num_execs,
            specialist_count=num_specialists,
            retry_count=retries,
            failure_recovery=len(failed_execs) == 0,
            conflict_count=0,
            decision_confidence=avg_confidence,
            health_score=avg_confidence,
            avg_token_usage=total_tokens // max(calls, 1),
            task_success_rate=len(successful_execs) / max(num_execs, 1),
            _event_count=calls,
            _latencies=latencies,
        )
