from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.features import Bottleneck
from app.repositories.features_repository import BottleneckRepository
from app.repositories.objective_repository import ObjectiveRepository


class BottleneckDetectionService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = BottleneckRepository(session)
        self._obj_repo = ObjectiveRepository(session)

    async def scan(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {"objective": {"raw": objective.raw_input}}

        result = await ai_kernel.run(
            task_type="bottleneck",
            prompt_template="bottleneck_v1.md",
            context=context,
        )

        bottlenecks_data = result.get("bottlenecks", [])

        existing_list = await self._repo.get_by_objective(objective_id)
        bottlenecks: list[dict[str, Any]] = []

        for bn in bottlenecks_data:
            description = bn.get("description", bn.get("name", "Unknown"))
            severity = bn.get("severity", "medium")
            bottleneck_type = bn.get("bottleneck_type", bn.get("type", "process"))
            title = bn.get("title", description[:200])
            root_cause = bn.get("root_cause", bn.get("cause", ""))
            recommended_resolution = bn.get("recommended_resolution", bn.get("recommendation", bn.get("resolution", "")))
            affected_entity_type = bn.get("affected_entity_type", "")

            existing = next(
                (e for e in existing_list if e.description == description),
                None,
            )
            if existing:
                await self._repo.update(existing.id, {
                    "severity": severity,
                    "root_cause": root_cause,
                    "recommended_resolution": recommended_resolution,
                })
                b = existing
            else:
                b = Bottleneck(
                    objective_id=objective_id,
                    bottleneck_type=bottleneck_type,
                    title=title,
                    description=description,
                    severity=severity,
                    root_cause=root_cause,
                    recommended_resolution=recommended_resolution,
                    affected_entity_type=affected_entity_type,
                    status="active",
                )
                b = await self._repo.create(b)

            bottlenecks.append({
                "id": b.id,
                "description": b.description,
                "severity": b.severity,
                "root_cause": b.root_cause,
                "recommended_resolution": b.recommended_resolution,
                "status": b.status,
            })

        return {"bottlenecks": bottlenecks}

    async def list_bottlenecks(
        self, objective_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict[str, Any]]:
        items = await self._repo.get_by_objective(objective_id)
        items = items[skip : skip + limit] if limit else items
        return [
            {
                "id": b.id,
                "description": b.description,
                "severity": b.severity,
                "root_cause": b.root_cause,
                "recommended_resolution": b.recommended_resolution,
                "status": b.status,
            }
            for b in items
        ]

    async def resolve(self, bottleneck_id: str) -> dict[str, Any] | None:
        b = await self._repo.update(bottleneck_id, {"status": "resolved"})
        if not b:
            return None
        return {
            "id": b.id,
            "description": b.description,
            "severity": b.severity,
            "root_cause": b.root_cause,
            "recommended_resolution": b.recommended_resolution,
            "status": b.status,
        }

    async def count_active(self, objective_id: str) -> int:
        items = await self._repo.get_by_objective(objective_id)
        return sum(1 for b in items if b.status == "active")
