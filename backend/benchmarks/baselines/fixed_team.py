from __future__ import annotations

import time as _time
from typing import Any

from app.kernel.ai_kernel import AIKernel
from benchmarks.baselines import Baseline
from benchmarks.metrics import BenchmarkMetrics


class FixedTeamBaseline(Baseline):
    """Baseline using a fixed multi-agent pipeline with sequential agents.

    Steps:
      1. Compiler — structured business information extraction
      2. Planner  — execution plan with milestones
      3. Organization — department structure with roles
      4. Risk     — risk identification and assessment
      5. Decision — strategic recommendation with options

    Each step receives context from previous steps. All steps are sequential.
    """

    def __init__(self, kernel: AIKernel) -> None:
        super().__init__(kernel)

    async def run(self, objective_text: str, dataset_name: str, iteration: int) -> BenchmarkMetrics:
        start = _time.monotonic()
        context: dict[str, Any] = {"objective": {"raw": objective_text}, "constraints": []}

        # Step 1: Compile
        t0 = _time.monotonic()
        compilation = await self._kernel.run(
            task_type="compile",
            prompt_template="compiler_v1.md",
            context=context,
            temperature=0.3,
            use_cache=False,
        )
        compile_latency = _time.monotonic() - t0
        context["compilation"] = compilation

        # Step 2: Plan
        t0 = _time.monotonic()
        plan = await self._kernel.run(
            task_type="plan",
            prompt_template="planner_v1.md",
            context={
                "objective": {"raw": objective_text},
                "compilation": compilation,
                "constraints": [],
            },
            temperature=0.4,
            use_cache=False,
        )
        plan_latency = _time.monotonic() - t0
        context["plan"] = plan

        # Step 3: Organization
        t0 = _time.monotonic()
        org = await self._kernel.run(
            task_type="organization",
            prompt_template="organization_v1.md",
            context={
                "compilation": {
                    "business_type": compilation.get("business_type", "startup"),
                    "industry": compilation.get("industry", ""),
                    "budget": compilation.get("budget", {}),
                },
                "plan": plan,
            },
            temperature=0.3,
            use_cache=False,
        )
        org_latency = _time.monotonic() - t0
        context["departments"] = org.get("departments", [])

        # Step 4: Risk
        t0 = _time.monotonic()
        risk = await self._kernel.run(
            task_type="risk",
            prompt_template="risk_v1.md",
            context={
                "objective": {"raw": objective_text},
                "constraints": [],
                "compilation": {"risks": compilation.get("risks", [])},
            },
            temperature=0.3,
            use_cache=False,
        )
        risk_latency = _time.monotonic() - t0
        context["risks"] = risk.get("risks", [])

        # Step 5: Decision
        t0 = _time.monotonic()
        decision = await self._kernel.run(
            task_type="decision",
            prompt_template="decision_v1.md",
            context={
                "objective": {"raw": objective_text},
                "compilation": compilation,
                "milestones": plan.get("milestones", []),
                "risks": risk.get("risks", []),
            },
            temperature=0.4,
            use_cache=False,
        )
        decision_latency = _time.monotonic() - t0

        elapsed = _time.monotonic() - start

        stats = self._kernel.get_stats()
        obs = stats.get("observability", {})
        tokens = stats.get("token_usage", {}).get("total", 0)
        calls = obs.get("total_calls", 0)

        task_success = all(
            isinstance(r, dict) for r in [compilation, plan, org, risk, decision]
        )

        confidences = [
            compilation.get("confidence", 0.0),
            plan.get("confidence", 0.0),
            org.get("confidence", 0.0),
            risk.get("confidence", 0.0),
            decision.get("confidence", 0.0),
        ]
        avg_confidence = sum(confidences) / len(confidences)

        return BenchmarkMetrics(
            baseline_name="FixedTeam",
            dataset_name=dataset_name,
            iteration=iteration,
            planning_latency=plan_latency,
            execution_latency=elapsed,
            total_runtime=elapsed,
            parallel_speedup=1.0,
            peak_concurrency=1,
            avg_concurrency=1.0,
            node_count=5,
            executive_count=0,
            specialist_count=0,
            retry_count=obs.get("failed", 0),
            failure_recovery=True,
            conflict_count=0,
            decision_confidence=avg_confidence,
            health_score=avg_confidence,
            avg_token_usage=tokens // max(calls, 1),
            task_success_rate=1.0 if task_success else 0.0,
            _event_count=calls,
            _latencies=[
                compile_latency,
                plan_latency,
                org_latency,
                risk_latency,
                decision_latency,
            ],
        )
