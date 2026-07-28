from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.features import ResourceGap
from app.repositories.features_repository import ResourceGapRepository
from app.repositories.objective_repository import ObjectiveRepository


class ResourceGapService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ResourceGapRepository(session)
        self._obj_repo = ObjectiveRepository(session)

    async def analyze(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {"objective": {"raw": objective.raw_input}}

        result = await ai_kernel.run(
            task_type="resource_gap",
            prompt_template="resource_gap_v1.md",
            context=context,
        )

        gaps = result.get("resource_gaps", result.get("gaps", []))
        overall_risk = result.get("overall_risk", result.get("severity", "medium"))

        existing = await self._repo.get_by_objective(objective_id)
        if existing:
            await self._repo.update(existing.id, {
                "gaps": gaps,
                "overall_risk": overall_risk,
            })
            rg = existing
        else:
            rg = ResourceGap(
                objective_id=objective_id,
                gaps=gaps,
                overall_risk=overall_risk,
            )
            rg = await self._repo.create(rg)

        return {
            "id": rg.id,
            "objective_id": rg.objective_id,
            "gaps": rg.gaps,
            "overall_risk": rg.overall_risk,
            "created_at": rg.created_at.isoformat() if rg.created_at else None,
        }

    async def get_analysis(self, objective_id: str) -> dict[str, Any] | None:
        rg = await self._repo.get_by_objective(objective_id)
        if not rg:
            return None
        return {
            "id": rg.id,
            "objective_id": rg.objective_id,
            "gaps": rg.gaps,
            "overall_risk": rg.overall_risk,
            "created_at": rg.created_at.isoformat() if rg.created_at else None,
        }
