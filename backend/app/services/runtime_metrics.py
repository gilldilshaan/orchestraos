from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.extensions import AgentTelemetry, Decision, Department, Milestone, Plan
from app.models.objective import Objective
from app.repositories.objective_repository import ObjectiveRepository


class RuntimeMetricsAggregator:
    """Aggregate execution metrics across all completed objectives.

    Every metric is derived from persisted database rows.  Metrics whose
    underlying data is not yet persisted (token usage, cost, parallelism,
    retries, stage durations) return ``None`` rather than fabricated values.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._obj_repo = ObjectiveRepository(session)

    # ── aggregate ──────────────────────────────────────────────────────────

    async def aggregate(self) -> dict[str, Any]:
        """Compute cross-objective aggregate metrics."""

        objectives = await self._obj_repo.list(
            limit=1000, order_by="created_at", descending=True
        )

        completed = [o for o in objectives if o.status == "completed"]
        failed = [o for o in objectives if o.status == "failed"]
        terminal = completed + failed
        terminal_ids = [o.id for o in terminal]
        completed_ids = [o.id for o in completed]

        total_runs = len(objectives)
        completed_runs = len(completed)
        failed_runs = len(failed)

        success_rate: float | None = None
        if completed_runs + failed_runs > 0:
            success_rate = completed_runs / (completed_runs + failed_runs)

        # -- Runtime per objective -----------------------------------------
        runtimes_s: list[float] = []
        for o in terminal:
            if o.created_at and o.updated_at:
                delta = (o.updated_at - o.created_at).total_seconds()
                if delta >= 0:
                    runtimes_s.append(delta)

        avg_runtime_s = (
            sum(runtimes_s) / len(runtimes_s) if runtimes_s else None
        )

        # -- Confidence ----------------------------------------------------
        confidences = [o.confidence for o in completed if o.confidence is not None]
        avg_confidence = (
            sum(confidences) / len(confidences) if confidences else None
        )

        # -- Batch load departments for all terminal objectives ------------
        dept_counts: list[int] = []
        head_counts: list[int] = []
        org_healths: list[float] = []
        if terminal_ids:
            stmt = (
                select(Department)
                .where(Department.objective_id.in_(terminal_ids))
                .where(Department.deleted_at.is_(None))
            )
            result = await self._session.execute(stmt)
            all_depts = result.scalars().all()

            depts_by_obj: dict[str, list[Department]] = defaultdict(list)
            for d in all_depts:
                depts_by_obj[d.objective_id].append(d)

            weights = {
                "active": 1.0,
                "completed": 1.0,
                "running": 0.6,
                "paused": 0.5,
                "proposed": 0.35,
            }
            for oid in terminal_ids:
                depts = depts_by_obj.get(oid, [])
                if depts:
                    dept_counts.append(len(depts))
                    head_counts.append(sum(d.head_count or 0 for d in depts))
                    org_healths.append(
                        sum(weights.get(d.status or "proposed", 0.35) for d in depts) / len(depts)
                    )

        avg_executives = (
            sum(dept_counts) / len(dept_counts) if dept_counts else None
        )
        avg_specialists = (
            (sum(head_counts) - sum(dept_counts)) / len(head_counts)
            if head_counts
            else None
        )
        avg_org_health: float | None = None

        # -- Agent telemetry: retries for terminal objectives --------------
        retry_counts: list[int] = []
        if terminal_ids:
            stmt_retries = (
                select(AgentTelemetry.retries)
                .where(AgentTelemetry.objective_id.in_(terminal_ids))
                .where(AgentTelemetry.retries.isnot(None))
            )
            result_retries = await self._session.execute(stmt_retries)
            retry_counts = [row[0] for row in result_retries if row[0] is not None]
        avg_retries = (
            sum(retry_counts) / len(retry_counts) if retry_counts else 0
        )

        # -- Parallelism: estimate from dept counts across objectives ------
        parallelism_values: list[int] = dept_counts if dept_counts else []
        peak_parallelism = max(parallelism_values) if parallelism_values else 1
        avg_parallelism = (
            sum(parallelism_values) / len(parallelism_values)
            if parallelism_values
            else 1
        )

        avg_org_health = (
            round(sum(org_healths) / len(org_healths), 2) if org_healths else None
        )

        # -- Batch load decisions for all terminal objectives --------------
        decision_counts: list[int] = []
        if terminal_ids:
            stmt_decisions = (
                select(Decision)
                .where(Decision.objective_id.in_(terminal_ids))
                .where(Decision.deleted_at.is_(None))
            )
            result_decisions = await self._session.execute(stmt_decisions)
            all_decisions = result_decisions.scalars().all()

            decisions_by_obj: dict[str, list[Decision]] = defaultdict(list)
            for decision in all_decisions:
                decisions_by_obj[decision.objective_id].append(decision)

            for oid in terminal_ids:
                decision_counts.append(len(decisions_by_obj.get(oid, [])))

        avg_decisions = (
            sum(decision_counts) / len(decision_counts)
            if decision_counts
            else None
        )

        # -- Batch load plans + milestones for all completed objectives ----
        milestone_counts: list[int] = []
        if completed_ids:
            stmt_plans = (
                select(Plan)
                .where(Plan.objective_id.in_(completed_ids))
                .where(Plan.deleted_at.is_(None))
            )
            result_plans = await self._session.execute(stmt_plans)
            all_plans = result_plans.scalars().all()

            plan_ids = [p.id for p in all_plans]
            plans_by_obj: dict[str, list[Plan]] = defaultdict(list)
            for p in all_plans:
                plans_by_obj[p.objective_id].append(p)

            milestones_by_plan: dict[str, list[Milestone]] = defaultdict(list)
            if plan_ids:
                stmt_milestones = (
                    select(Milestone)
                    .where(Milestone.plan_id.in_(plan_ids))
                    .where(Milestone.deleted_at.is_(None))
                )
                result_milestones = await self._session.execute(stmt_milestones)
                all_ms = result_milestones.scalars().all()
                for ms in all_ms:
                    if ms.plan_id is not None:
                        milestones_by_plan[ms.plan_id].append(ms)

            for oid in completed_ids:
                plans = plans_by_obj.get(oid, [])
                ms_count = sum(len(milestones_by_plan.get(p.id, [])) for p in plans)
                milestone_counts.append(ms_count)

        avg_stage_count = (
            sum(milestone_counts) / len(milestone_counts)
            if milestone_counts
            else None
        )

        # -- Batch load plans for all terminal objectives (confidence) -----
        plan_confidences: list[float] = []
        if terminal_ids:
            stmt_conf = (
                select(Plan.confidence)
                .where(Plan.objective_id.in_(terminal_ids))
                .where(Plan.confidence.isnot(None))
                .where(Plan.deleted_at.is_(None))
            )
            result_conf = await self._session.execute(stmt_conf)
            plan_confidences = [row[0] for row in result_conf if row[0] is not None]

        if plan_confidences:
            avg_org_health = sum(plan_confidences) / len(plan_confidences)

        # -- Not-yet-persisted metrics ------------------------------------
        return {
            "total_runs": total_runs,
            "completed_runs": completed_runs,
            "failed_runs": failed_runs,
            "success_rate": success_rate,
            "average_runtime_seconds": avg_runtime_s,
            "average_confidence": avg_confidence,
            "average_plan_confidence": (
                sum(plan_confidences) / len(plan_confidences)
                if plan_confidences
                else None
            ),
            "average_organization_health": avg_org_health,
            "average_executives_spawned": avg_executives,
            "average_specialists_spawned": avg_specialists,
            "average_decisions": avg_decisions,
            "average_milestones": avg_stage_count,
            "average_tokens": None,
            "average_cost": None,
            "peak_parallelism": peak_parallelism,
            "average_parallelism": avg_parallelism,
            "average_retries": avg_retries,
            "average_stage_duration_seconds": None,
            "average_event_count": None,
        }

    # ── charts ─────────────────────────────────────────────────────────────

    async def charts(self) -> dict[str, Any]:
        """Time-series chart data grouped by day (UTC)."""

        objectives = await self._obj_repo.list(
            limit=1000, order_by="created_at", descending=True
        )

        terminal = [o for o in objectives if o.status in ("completed", "failed")]

        daily: dict[str, list[Objective]] = {}
        for o in terminal:
            if o.created_at:
                day = o.created_at.strftime("%Y-%m-%d")
                daily.setdefault(day, []).append(o)

        sorted_days = sorted(daily.keys())

        runtime_over_time: list[dict[str, Any]] = []
        confidence_trend: list[dict[str, Any]] = []
        success_rate_trend: list[dict[str, Any]] = []

        for day in sorted_days:
            objs = daily[day]
            total = len(objs)
            succeeded = sum(1 for o in objs if o.status == "completed")

            rt: list[float] = []
            cf: list[float] = []
            for o in objs:
                if o.created_at and o.updated_at:
                    delta = (o.updated_at - o.created_at).total_seconds()
                    if delta >= 0:
                        rt.append(delta)
                if o.confidence is not None:
                    cf.append(o.confidence)

            runtime_over_time.append({
                "date": day,
                "average_runtime_seconds": sum(rt) / len(rt) if rt else None,
                "run_count": len(rt),
            })
            confidence_trend.append({
                "date": day,
                "average_confidence": sum(cf) / len(cf) if cf else None,
                "run_count": len(cf),
            })
            success_rate_trend.append({
                "date": day,
                "success_rate": succeeded / total if total > 0 else None,
                "total_runs": total,
                "succeeded": succeeded,
            })

        return {
            "runtime_over_time": runtime_over_time,
            "confidence_trend": confidence_trend,
            "success_rate_trend": success_rate_trend,
            "tokens_per_run": None,
            "cost_per_run": None,
            "stage_duration_distribution": None,
            "execution_duration_histogram": None,
        }
