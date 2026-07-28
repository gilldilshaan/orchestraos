from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.features import SuccessProbability
from app.repositories.features_repository import SuccessProbabilityRepository
from app.repositories.objective_repository import ObjectiveRepository


class SuccessProbabilityService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = SuccessProbabilityRepository(session)
        self._obj_repo = ObjectiveRepository(session)

    async def calculate(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {"objective": {"raw": objective.raw_input}}

        result = await ai_kernel.run(
            task_type="success_probability",
            prompt_template="success_probability_v1.md",
            context=context,
        )

        existing = await self._repo.get_by_objective(objective_id)
        if existing:
            await self._repo.update(existing.id, {
                "success_probability": result.get("success_probability", result.get("overall_probability", 0)),
                "failure_risk": result.get("failure_risk", 0),
                "delay_risk": result.get("delay_risk", 0),
                "budget_overrun_risk": result.get("budget_overrun_risk", 0),
                "team_risk": result.get("team_risk", 0),
                "confidence_score": result.get("confidence_score", 0),
                "reasoning": result.get("reasoning"),
                "risk_factors": result.get("risk_factors", []),
                "mitigating_factors": result.get("mitigating_factors", []),
            })
            prob = existing
        else:
            prob = SuccessProbability(
                objective_id=objective_id,
                success_probability=result.get("success_probability", result.get("overall_probability", 0)),
                failure_risk=result.get("failure_risk", 0),
                delay_risk=result.get("delay_risk", 0),
                budget_overrun_risk=result.get("budget_overrun_risk", 0),
                team_risk=result.get("team_risk", 0),
                confidence_score=result.get("confidence_score", 0),
                reasoning=result.get("reasoning"),
                risk_factors=result.get("risk_factors", []),
                mitigating_factors=result.get("mitigating_factors", []),
            )
            prob = await self._repo.create(prob)

        return {
            "id": prob.id,
            "objective_id": prob.objective_id,
            "success_probability": prob.success_probability,
            "confidence_score": prob.confidence_score,
            "created_at": prob.created_at.isoformat() if prob.created_at else None,
        }

    async def get_probability(self, objective_id: str) -> dict[str, Any] | None:
        prob = await self._repo.get_by_objective(objective_id)
        if not prob:
            return None
        return {
            "id": prob.id,
            "objective_id": prob.objective_id,
            "success_probability": prob.success_probability,
            "confidence_score": prob.confidence_score,
            "created_at": prob.created_at.isoformat() if prob.created_at else None,
        }
