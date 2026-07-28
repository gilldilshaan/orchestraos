from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.kernel.ai_kernel import AIKernel
from app.kernel.context_manager import ExecutionContext
from app.repositories.extensions_repository import (
    ExplanationRepository,
)
from app.repositories.objective_repository import ObjectiveRepository


class BaseAgent(ABC):
    """Abstract base for all AI agents.

    Agents now receive the AIKernel instead of calling llm_client directly.
    They also receive an optional ExecutionContext for shared state.
    """

    def __init__(
        self,
        session: AsyncSession,
        kernel: AIKernel | None = None,
        context: ExecutionContext | None = None,
    ) -> None:
        self._session = session
        self._kernel = kernel
        self._context = context

    @property
    def _llm(self) -> AIKernel:
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
        evidence: list | None = None,
        confidence: float | None = None,
        risk_level: str | None = None,
        affected_departments: list[str] | None = None,
        assumptions: list | None = None,
        model_used: str | None = None,
    ) -> None:
        from app.models.extensions import Explanation

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
            model_used=model_used or self._llm.model_router.get_preferred_provider("compile"),
        )
        await repo.create(explanation)
