from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent


class CEOAgent(BaseAgent):
    async def run(self, objective_id: str) -> dict[str, Any]:
        from app.repositories.objective_repository import ObjectiveRepository

        obj_repo = ObjectiveRepository(self._session)
        objective = await obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {"objective": {"raw": objective.raw_input}}

        result = await self._llm.run(
            task_type="ceo_analysis",
            prompt_template="ceo_v1.md",
            context=context,
            temperature=0.5,
        )

        await self._save_explanation(
            entity_type="CEOAnalysis",
            entity_id=objective_id,
            recommendation=(
                f"Build a {result.get('recommended_company_type', 'custom organization')}"
            ),
            reasoning=result.get("reasoning", ""),
            evidence=[str(result)],
            confidence=0.85,
            risk_level="low",
        )

        return {
            "objective_id": objective_id,
            "domain": result.get("domain", "general"),
            "complexity": result.get("complexity", "medium"),
            "reasoning": result.get("reasoning", ""),
            "recommended_company_type": result.get("recommended_company_type", ""),
            "key_expertise_areas": result.get("key_expertise_areas", []),
        }
