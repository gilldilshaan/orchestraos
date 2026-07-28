from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel import ai_kernel
from app.models.features import BusinessReadiness
from app.repositories.features_repository import BusinessReadinessRepository
from app.repositories.objective_repository import ObjectiveRepository


class BusinessReadinessService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = BusinessReadinessRepository(session)
        self._obj_repo = ObjectiveRepository(session)

    async def assess(self, objective_id: str) -> dict[str, Any]:
        objective = await self._obj_repo.get(objective_id)
        if not objective:
            return {"error": "Objective not found"}

        context = {"objective": {"raw": objective.raw_input}}

        result = await ai_kernel.run(
            task_type="readiness",
            prompt_template="readiness_v1.md",
            context=context,
        )

        existing = await self._repo.get_by_objective(objective_id)
        if existing:
            assessment = existing
            update_data = {
                "overall_score": result.get("overall_score", 0),
                "market_readiness": result.get("market_readiness"),
                "technical_feasibility": result.get("technical_feasibility"),
                "budget_readiness": result.get("budget_readiness"),
                "team_readiness": result.get("team_readiness"),
                "timeline_feasibility": result.get("timeline_feasibility"),
                "strengths": result.get("strengths", []),
                "weaknesses": result.get("weaknesses", []),
                "recommendations": result.get("recommendations", []),
                "category_scores": result.get("category_scores"),
            }
            await self._repo.update(existing.id, update_data)
        else:
            assessment = BusinessReadiness(
                objective_id=objective_id,
                overall_score=result.get("overall_score", 0),
                market_readiness=result.get("market_readiness"),
                technical_feasibility=result.get("technical_feasibility"),
                budget_readiness=result.get("budget_readiness"),
                team_readiness=result.get("team_readiness"),
                timeline_feasibility=result.get("timeline_feasibility"),
                strengths=result.get("strengths", []),
                weaknesses=result.get("weaknesses", []),
                recommendations=result.get("recommendations", []),
                category_scores=result.get("category_scores"),
            )
            assessment = await self._repo.create(assessment)

        return {
            "id": assessment.id,
            "objective_id": assessment.objective_id,
            "overall_score": assessment.overall_score,
            "market_readiness": assessment.market_readiness,
            "technical_feasibility": assessment.technical_feasibility,
            "budget_readiness": assessment.budget_readiness,
            "team_readiness": assessment.team_readiness,
            "timeline_feasibility": assessment.timeline_feasibility,
            "strengths": assessment.strengths,
            "weaknesses": assessment.weaknesses,
            "recommendations": assessment.recommendations,
            "category_scores": assessment.category_scores,
            "created_at": assessment.created_at.isoformat() if assessment.created_at else None,
        }

    async def get_assessment(self, objective_id: str) -> dict[str, Any] | None:
        assessment = await self._repo.get_by_objective(objective_id)
        if not assessment:
            return None
        return {
            "id": assessment.id,
            "objective_id": assessment.objective_id,
            "overall_score": assessment.overall_score,
            "market_readiness": assessment.market_readiness,
            "technical_feasibility": assessment.technical_feasibility,
            "budget_readiness": assessment.budget_readiness,
            "team_readiness": assessment.team_readiness,
            "timeline_feasibility": assessment.timeline_feasibility,
            "strengths": assessment.strengths,
            "weaknesses": assessment.weaknesses,
            "recommendations": assessment.recommendations,
            "category_scores": assessment.category_scores,
            "created_at": assessment.created_at.isoformat() if assessment.created_at else None,
        }
