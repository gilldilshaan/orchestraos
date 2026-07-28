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

        existing = await self._repo.get_by_objective(objective_id)
        if existing:
            await self._repo.update(existing.id, {
                "missing_roles": result.get("missing_roles", []),
                "missing_skills": result.get("missing_skills", []),
                "hiring_needs": result.get("hiring_needs", []),
                "estimated_cost": result.get("estimated_cost"),
                "estimated_hiring_timeline": result.get("estimated_hiring_timeline"),
                "hiring_priority": result.get("hiring_priority", []),
                "available_resources": result.get("available_resources"),
                "required_resources": result.get("required_resources"),
            })
            rg = existing
        else:
            rg = ResourceGap(
                objective_id=objective_id,
                missing_roles=result.get("missing_roles", []),
                missing_skills=result.get("missing_skills", []),
                hiring_needs=result.get("hiring_needs", []),
                estimated_cost=result.get("estimated_cost"),
                estimated_hiring_timeline=result.get("estimated_hiring_timeline"),
                hiring_priority=result.get("hiring_priority", []),
                available_resources=result.get("available_resources"),
                required_resources=result.get("required_resources"),
            )
            rg = await self._repo.create(rg)

        return {
            "id": rg.id,
            "objective_id": rg.objective_id,
            "missing_roles": rg.missing_roles,
            "missing_skills": rg.missing_skills,
            "created_at": rg.created_at.isoformat() if rg.created_at else None,
        }

    async def get_analysis(self, objective_id: str) -> dict[str, Any] | None:
        rg = await self._repo.get_by_objective(objective_id)
        if not rg:
            return None
        return {
            "id": rg.id,
            "objective_id": rg.objective_id,
            "missing_roles": rg.missing_roles,
            "missing_skills": rg.missing_skills,
            "created_at": rg.created_at.isoformat() if rg.created_at else None,
        }
