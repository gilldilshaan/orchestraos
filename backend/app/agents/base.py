from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class BaseAgent(ABC):
    """Abstract base for all AI agents.

    Agents now receive the AIKernel instead of calling llm_client directly.
    They also receive an optional ExecutionContext for shared state.
    """

    def __init__(
        self,
        session: AsyncSession,
        kernel: Any | None = None,
        context: Any | None = None,
    ) -> None:
        self._session = session
        self._kernel = kernel
        self._context = context

    @property
    def _llm(self) -> Any:
        from app.kernel import ai_kernel
        return self._kernel or ai_kernel

    @abstractmethod
    async def run(self, objective_id: str) -> dict[str, Any]:
        ...

    async def _save_explanation(
        self,
        entity_type: str,
        entity_id: str,
        recommendation: str,
        reasoning: str,
        evidence: list[Any] | None = None,
        confidence: float | None = None,
        risk_level: str | None = None,
        affected_departments: list[str] | None = None,
        assumptions: list[Any] | None = None,
        model_used: str | None = None,
    ) -> None:
        from app.models.extensions import Explanation
        from app.repositories.extensions_repository import ExplanationRepository

        repo = ExplanationRepository(self._session)
        explanation = Explanation(
            entity_type=entity_type,
            entity_id=entity_id,
            recommendation=recommendation,
            reasoning=reasoning,
            evidence=evidence or [],
            assumptions=assumptions or [],
            confidence=confidence,
            risk_level=risk_level or "medium",
            affected_departments=affected_departments or [],
            dependencies=[],
            model_used=model_used or (
                self._llm.model_router.get_preferred_provider("compile")
                if hasattr(self._llm, "model_router")
                else None
            ),
        )
        await repo.create(explanation)
