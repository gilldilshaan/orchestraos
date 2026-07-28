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

        factors = result.get("factors", [])
        overall_score = result.get("overall_probability", result.get("overall_score", 0))

        existing = await self._repo.get_by_objective(objective_id)
        if existing:
            await self._repo.update(existing.id, {
                "overall_probability": overall_score,
                "factors": factors,
            })
            prob = existing
        else:
            prob = SuccessProbability(
                objective_id=objective_id,
                overall_probability=overall_score,
                factors=factors,
            )
            prob = await self._repo.create(prob)

        return {
            "id": prob.id,
            "objective_id": prob.objective_id,
            "overall_probability": prob.overall_probability,
            "factors": prob.factors,
            "created_at": prob.created_at.isoformat() if prob.created_at else None,
        }

    async def get_probability(self, objective_id: str) -> dict[str, Any] | None:
        prob = await self._repo.get_by_objective(objective_id)
        if not prob:
            return None
        return {
            "id": prob.id,
            "objective_id": prob.objective_id,
            "overall_probability": prob.overall_probability,
            "factors": prob.factors,
            "created_at": prob.created_at.isoformat() if prob.created_at else None,
        }
