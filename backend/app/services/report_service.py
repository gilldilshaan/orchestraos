from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.objective import Objective
from app.repositories.extensions_repository import (
    DecisionRepository,
    DepartmentRepository,
    MilestoneRepository,
    PlanRepository,
    RiskRepository,
)
from app.repositories.objective_repository import ObjectiveRepository


class ReportService:
    """Builds the normalized executive report payload for the Reports page.

    Prefers the persisted kernel report (OrganizationReport produced by the
    dynamic organization execution).  Falls back to a synthesized report built
    from persisted domain entities (plans, risks, decisions, departments).
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._obj_repo = ObjectiveRepository(session)
        self._plan_repo = PlanRepository(session)
        self._milestone_repo = MilestoneRepository(session)
        self._risk_repo = RiskRepository(session)
        self._decision_repo = DecisionRepository(session)
        self._dept_repo = DepartmentRepository(session)

    async def get_report(self, objective_id: str) -> dict[str, Any] | None:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return None

        stored = (objective.metadata_ or {}).get("report") if objective.metadata_ else None
        if stored and stored.get("organization_report"):
            return self._from_kernel_report(objective, stored)
        if stored and stored.get("results"):
            return await self._synthesize(objective, stored)
        return await self._synthesize(objective, None)

    # ── Kernel report (OrganizationReport) ────────────────────────────────────

    def _from_kernel_report(
        self, objective: Objective, stored: dict[str, Any]
    ) -> dict[str, Any]:
        org = stored.get("organization_report") or {}
        final = stored.get("final_report") or {}
        health = float(org.get("health_score") or 0)
        if health <= 1.0:
            health *= 100

        final_summary = org.get("final_summary") or ""
        if not final_summary:
            final_summary = final.get("final_report") if isinstance(final, dict) else None
        if not final_summary and isinstance(final, dict):
            final_summary = final.get("summary")

        return {
            "objective_id": objective.id,
            "objective_title": objective.raw_input,
            "status": objective.status,
            "source": "kernel",
            "generated_at": stored.get("generated_at"),
            "final_summary": final_summary or "",
            "health_score": round(health, 1),
            "confidence": round(float(org.get("confidence") or 0), 3),
            "recommendations": org.get("recommendations") or [],
            "bottlenecks": org.get("bottlenecks") or [],
            "conflicts": org.get("conflicts") or [],
            "execution_metrics": org.get("execution_metrics") or {},
            "executive_reports": org.get("executive_reports") or [],
            "supervisor_analyses": org.get("supervisor_analyses") or [],
            "supervisor_actions": org.get("supervisor_actions") or [],
            "results": stored.get("results") or [],
        }

    # ── Synthesized report (full pipeline / DB entities) ─────────────────────

    async def _synthesize(
        self,
        objective: Objective,
        stored: dict[str, Any] | None,
    ) -> dict[str, Any]:
        plans = await self._plan_repo.list_by_objective(objective.id)
        milestones = 0
        if plans:
            milestones = len(await self._milestone_repo.list_by_plan(plans[0].id))
        risks = await self._risk_repo.list_by_objective(objective.id)
        decisions = await self._decision_repo.list_by_objective(objective.id)
        depts = await self._dept_repo.list_by_objective(objective.id)

        risk_counts: dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for r in risks:
            level = r.risk_level if r.risk_level in risk_counts else "medium"
            risk_counts[level] += 1

        health = 100 - risk_counts["critical"] * 25 - risk_counts["high"] * 10
        pending_decisions = sum(1 for d in decisions if d.status == "PENDING")
        health = max(0, min(100, health - pending_decisions * 5))

        recommendations: list[str] = []
        for d in decisions:
            if d.recommendation and d.recommendation not in recommendations:
                recommendations.append(d.recommendation)

        final_summary = objective.compiled_summary or ""
        if not final_summary and plans and plans[0].description:
            final_summary = plans[0].description

        confidence_values = [
            d.confidence for d in decisions if d.confidence is not None
        ]
        confidence = (
            round(sum(confidence_values) / len(confidence_values), 3)
            if confidence_values else 0.0
        )

        return {
            "objective_id": objective.id,
            "objective_title": objective.raw_input,
            "status": objective.status,
            "source": "synthesized",
            "generated_at": (stored or {}).get("generated_at"),
            "final_summary": final_summary or "",
            "health_score": round(health, 1),
            "confidence": confidence,
            "recommendations": recommendations,
            "bottlenecks": [],
            "conflicts": [],
            "execution_metrics": {
                "plans": len(plans),
                "milestones": milestones,
                "risks": len(risks),
                "decisions": len(decisions),
                "departments": len(depts),
                "risk_levels": risk_counts,
                "pending_decisions": pending_decisions,
            },
            "executive_reports": [
                {
                    "executive_id": d.id,
                    "executive_title": d.title,
                    "execution_summary": d.recommendation or d.reasoning or "",
                    "aggregated_findings": d.evidence or [],
                    "risks": [],
                    "confidence": d.confidence or 0,
                    "status": d.status,
                    "specialist_reports": [],
                }
                for d in decisions
            ],
            "supervisor_analyses": [],
            "supervisor_actions": [],
            "results": (stored or {}).get("results") or [],
        }
