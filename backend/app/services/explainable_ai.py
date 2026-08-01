from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.extensions import Explanation
from app.repositories.extensions_repository import ExplanationRepository

logger = logging.getLogger(__name__)


class ExplainableAIService:
    """Ensures every AI recommendation includes explanation metadata.

    Every recommendation must include: why, reasoning, evidence, assumptions,
    confidence, trade-offs, risks, dependencies, and affected modules.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ExplanationRepository(session)

    def enrich_prompt(self, base_prompt: str) -> str:
        return (
            base_prompt + (
                "\n\nIMPORTANT: Your response must include explanation metadata.\n"
                "In your output JSON, include these explanation fields:\n"
                "- recommendation: the actual recommendation\n"
                "- reasoning: detailed reasoning behind the recommendation\n"
                "- evidence: list of evidence points supporting this\n"
                "- assumptions: list of assumptions made\n"
                "- confidence: confidence score (0.0-1.0)\n"
                "- trade_offs: list of trade-offs considered\n"
                "- risks: list of {risk, likelihood, impact} objects\n"
                "- dependencies: list of dependencies\n"
                "- affected_modules: list of affected system modules"
            )
        )

    def wrap_result(self, raw_result: dict[str, Any]) -> dict[str, Any]:
        return {
            "recommendation": raw_result.get("recommendation"),
            "reasoning": raw_result.get("reasoning"),
            "evidence": raw_result.get("evidence", []),
            "assumptions": raw_result.get("assumptions", []),
            "confidence": raw_result.get("confidence"),
            "trade_offs": raw_result.get("trade_offs", []),
            "risks": raw_result.get("risks", []),
            "dependencies": raw_result.get("dependencies", []),
            "affected_modules": raw_result.get("affected_modules", []),
        }

    async def generate_pipeline_explanation(
        self, objective_id: str, pipeline_result: dict[str, Any]
    ) -> dict[str, Any]:
        """Generate a pipeline-level explanation summarizing the full workflow result."""
        results = pipeline_result.get("results", {})
        completed = pipeline_result.get("completed_steps", [])
        errors = pipeline_result.get("errors")

        explanation = Explanation(
            entity_type="Pipeline",
            entity_id=objective_id,
            recommendation=f"Full pipeline completed with {len(completed)} steps" +
                          (f" ({len(errors)} errors)" if errors else ""),
            reasoning=f"Pipeline executed steps: {', '.join(completed)}. "
                      f"Result: {pipeline_result.get('status', 'unknown')}.",
            evidence=[str(r.get("data", r))[:200] for _, r in list(results.items())[:5]],
            assumptions=[],
            confidence=0.9 if not errors else 0.7,
            risk_level="low" if not errors else "medium",
            affected_departments=[],
            dependencies=completed,
            model_used="pipeline",
        )
        created = await self._repo.create(explanation)

        return {
            "id": created.id,
            "entity_type": created.entity_type,
            "entity_id": created.entity_id,
            "recommendation": created.recommendation,
            "reasoning": created.reasoning,
            "confidence": created.confidence,
        }

    async def get_explanations(
        self, entity_type: str, entity_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict[str, Any]]:
        explanations = await self._repo.list_by_entity(
            entity_type, entity_id, skip=skip, limit=limit
        )
        return [
            {
                "id": e.id,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "recommendation": e.recommendation,
                "reasoning": e.reasoning,
                "confidence": e.confidence,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in explanations
        ]
