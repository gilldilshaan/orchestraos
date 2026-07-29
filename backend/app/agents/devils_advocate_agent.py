from __future__ import annotations

from typing import Any

from app.agents import BaseAgent
from app.models.features import DevilsAdvocateCritique
from app.repositories.extensions_repository import (
    DepartmentRepository,
    MilestoneRepository,
    PlanRepository,
    RiskRepository,
)
from app.repositories.features_repository import DevilsAdvocateRepository
from app.repositories.objective_repository import ObjectiveRepository
from app.schemas.llm_outputs import DevilsAdvocateOutputSchema


class DevilsAdvocateAgent(BaseAgent):
    async def run(self, objective_id: str, plan_id: str | None = None) -> dict[str, Any]:
        obj_repo = ObjectiveRepository(self._session)
        plan_repo = PlanRepository(self._session)
        milestone_repo = MilestoneRepository(self._session)
        risk_repo = RiskRepository(self._session)
        dept_repo = DepartmentRepository(self._session)
        repo = DevilsAdvocateRepository(self._session)

        objective = await obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        plan = None
        milestones = []
        if plan_id:
            plan = await plan_repo.get(plan_id)
            if plan:
                milestones = await milestone_repo.list_by_plan(plan_id)
        else:
            plans = await plan_repo.list_by_objective(objective_id)
            if plans:
                plan = plans[0]
                milestones = await milestone_repo.list_by_plan(plan.id)
                plan_id = plan.id

        risks = await risk_repo.list_by_objective(objective_id)
        departments = await dept_repo.list_by_objective(objective_id)

        context = {
            "objective": {"raw": objective.raw_input[:500]},
            "constraints": objective.constraints,
            "plan": {
                "roadmap": plan.roadmap if plan else None,
                "timeline": plan.timeline if plan else None,
                "total_cost": plan.total_cost if plan else None,
            }
            if plan
            else None,
            "milestones": [
                {
                    "name": m.name,
                    "status": m.status,
                    "order": m.order,
                    "dependencies": m.dependencies or [],
                }
                for m in milestones
            ],
            "risks": [
                {
                    "title": r.title,
                    "risk_level": r.risk_level,
                    "probability": r.probability,
                    "impact": r.impact,
                    "category": r.category,
                }
                for r in risks[:10]
            ],
            "departments": [
                {"name": d.name, "head_count": d.head_count, "budget": d.budget}
                for d in departments[:10]
            ],
        }

        result = await self._llm.run(
            task_type="devils_advocate",
            prompt_template="devils_advocate_v1.md",
            context=context,
            schema=DevilsAdvocateOutputSchema,
        )

        critique = DevilsAdvocateCritique(
            objective_id=objective_id,
            plan_id=plan_id,
            critique_score=result.get("critique_score", 50),
            counter_arguments=result.get("counter_arguments", []),
            risks=result.get("risks", []),
            assumptions=result.get("assumptions", []),
            better_alternatives=result.get("better_alternatives", []),
            recommendations=result.get("recommendations", []),
            model_used=self._llm.model_router.get_preferred_provider("devils_advocate"),
        )
        critique = await repo.create(critique)

        await self._save_explanation(
            entity_type="DevilsAdvocateCritique",
            entity_id=critique.id,
            recommendation=f"Devil's Advocate critique score: {critique.critique_score}/100",
            reasoning="Rigorous challenge of strategy and execution plan via AIKernel",
            evidence=[str(result)],
            confidence=0.85,
            risk_level="high"
            if critique.critique_score > 70
            else "medium"
            if critique.critique_score > 40
            else "low",
            assumptions=[a.get("assumption", "") for a in (result.get("assumptions", []) or [])],
            model_used=self._llm.model_router.get_preferred_provider("devils_advocate"),
        )

        return {
            "id": critique.id,
            "objective_id": critique.objective_id,
            "plan_id": critique.plan_id,
            "critique_score": critique.critique_score,
            "counter_arguments": critique.counter_arguments,
            "risks": critique.risks,
            "assumptions": critique.assumptions,
            "better_alternatives": critique.better_alternatives,
            "recommendations": critique.recommendations,
            "created_at": critique.created_at.isoformat() if critique.created_at else None,
        }
