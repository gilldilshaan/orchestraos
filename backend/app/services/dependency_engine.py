from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.features import DependencyGraph
from app.repositories.features_repository import DependencyGraphRepository
from app.repositories.objective_repository import ObjectiveRepository


class DependencyEngineService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = DependencyGraphRepository(session)
        self._obj_repo = ObjectiveRepository(session)

    async def build_graph(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {"objective": {"raw": objective.raw_input}}

        result = await ai_kernel.run(
            task_type="dependency_graph",
            prompt_template="dependency_graph_v1.md",
            context=context,
        )

        nodes = result.get("nodes", [])
        edges = result.get("edges", [])
        critical_path = result.get("critical_path", [])

        existing = await self._repo.get_by_objective(objective_id)
        if existing:
            await self._repo.update(existing.id, {
                "nodes": nodes,
                "edges": edges,
                "critical_path": critical_path,
            })
            dg = existing
        else:
            dg = DependencyGraph(
                objective_id=objective_id,
                nodes=nodes,
                edges=edges,
                critical_path=critical_path,
            )
            dg = await self._repo.create(dg)

        return {
            "id": dg.id,
            "objective_id": dg.objective_id,
            "nodes": dg.nodes,
            "edges": dg.edges,
            "critical_path": dg.critical_path,
            "created_at": dg.created_at.isoformat() if dg.created_at else None,
        }

    async def get_graph(self, objective_id: str) -> dict[str, Any] | None:
        dg = await self._repo.get_by_objective(objective_id)
        if not dg:
            return None
        return {
            "id": dg.id,
            "objective_id": dg.objective_id,
            "nodes": dg.nodes,
            "edges": dg.edges,
            "critical_path": dg.critical_path,
            "created_at": dg.created_at.isoformat() if dg.created_at else None,
        }
