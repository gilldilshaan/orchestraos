from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.client import llm_client
from app.repositories.extensions_repository import ExplanationRepository


class ExplainableAIService:
    """Ensures every AI recommendation includes explanation metadata.

    This service wraps AI responses to enforce the Explainable AI requirement:
    every recommendation must include why, reasoning, evidence, assumptions,
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

    async def get_explanations(
        self, entity_type: str, entity_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict[str, Any]]:
        return await self._repo.list_by_entity(entity_type, entity_id, skip=skip, limit=limit)
