from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.repositories.objective_repository import ObjectiveRepository


class ScenarioSimulatorService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._obj_repo = ObjectiveRepository(session)
        self._scenarios: dict[str, list[dict[str, Any]]] = {}

    async def simulate(
        self, objective_id: str, scenario_input: str | None = None
    ) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {
            "objective": {"raw": objective.raw_input},
            "scenario_input": scenario_input or "Default scenario",
        }

        result = await ai_kernel.run(
            task_type="scenario",
            prompt_template="scenario_v1.md",
            context=context,
        )

        scenario = {
            "id": __import__("uuid").uuid4().hex[:12],
            "objective_id": objective_id,
            "scenario_name": result.get("scenario_name", scenario_input or "Default"),
            "description": result.get("description", ""),
            "success_probability": result.get("success_probability", 0.5),
            "timeline_impact": result.get("timeline_impact", ""),
            "resource_impact": result.get("resource_impact", ""),
            "risk_profile": result.get("risk_profile", "medium"),
            "recommended_actions": result.get("recommended_actions", []),
            "trade_offs": result.get("trade_offs", []),
            "comparison_to_current": result.get("comparison_to_current", ""),
        }

        if objective_id not in self._scenarios:
            self._scenarios[objective_id] = []
        self._scenarios[objective_id].append(scenario)

        return scenario

    async def list_scenarios(
        self, objective_id: str
    ) -> list[dict[str, Any]]:
        return self._scenarios.get(objective_id, [])

    async def get_scenario(
        self, objective_id: str, scenario_id: str
    ) -> dict[str, Any] | None:
        scenarios = self._scenarios.get(objective_id, [])
        for s in scenarios:
            if s["id"] == scenario_id:
                return s
        return None
