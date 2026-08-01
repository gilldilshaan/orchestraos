from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.features import DecisionMemoryEntry
from app.repositories.features_repository import DecisionMemoryRepository


class DecisionMemoryService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = DecisionMemoryRepository(session)

    async def record_decision(
        self,
        objective_id: str,
        title: str,
        decision_text: str | None = None,
        reason: str | None = None,
        evidence: list[Any] | None = None,
        alternatives: list[Any] | None = None,
        approver: str | None = None,
        decision_date: datetime | None = None,
        impact: str | None = None,
        tags: list[Any] | None = None,
        decision_id: str | None = None,
    ) -> dict[str, Any]:
        entry = DecisionMemoryEntry(
            objective_id=objective_id,
            decision_id=decision_id,
            title=title,
            decision_text=decision_text,
            reason=reason,
            evidence=evidence or [],
            alternatives=alternatives or [],
            approver=approver,
            decision_date=decision_date or datetime.now(UTC),
            impact=impact,
            tags=tags or [],
        )
        entry = await self._repo.create(entry)
        return {
            "id": entry.id,
            "objective_id": entry.objective_id,
            "decision_id": entry.decision_id,
            "title": entry.title,
            "decision_text": entry.decision_text,
            "reason": entry.reason,
            "evidence": entry.evidence,
            "alternatives": entry.alternatives,
            "approver": entry.approver,
            "decision_date": entry.decision_date.isoformat() if entry.decision_date else None,
            "impact": entry.impact,
            "tags": entry.tags,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        }

    async def list_decisions(
        self,
        objective_id: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        if objective_id:
            entries = await self._repo.list_by_objective(objective_id, skip=skip, limit=limit)
        else:
            entries = await self._repo.list_all(skip=skip, limit=limit)
        return [
            {
                "id": e.id,
                "objective_id": e.objective_id,
                "decision_id": e.decision_id,
                "title": e.title,
                "decision_text": e.decision_text,
                "reason": e.reason,
                "evidence": e.evidence,
                "alternatives": e.alternatives,
                "approver": e.approver,
                "decision_date": e.decision_date.isoformat() if e.decision_date else None,
                "impact": e.impact,
                "tags": e.tags,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]

    async def get_decision(self, entry_id: str) -> dict[str, Any] | None:
        entry = await self._repo.get(entry_id)
        if not entry:
            return None
        return {
            "id": entry.id,
            "objective_id": entry.objective_id,
            "decision_id": entry.decision_id,
            "title": entry.title,
            "decision_text": entry.decision_text,
            "reason": entry.reason,
            "evidence": entry.evidence,
            "alternatives": entry.alternatives,
            "approver": entry.approver,
            "decision_date": entry.decision_date.isoformat() if entry.decision_date else None,
            "impact": entry.impact,
            "tags": entry.tags,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        }

    async def auto_record_from_decision(
        self, decision_id: str, objective_id: str
    ) -> dict[str, Any] | None:
        from app.repositories.extensions_repository import DecisionRepository

        decision_repo = DecisionRepository(self._session)
        decision = await decision_repo.get(decision_id)
        if not decision:
            return None

        return await self.record_decision(
            objective_id=objective_id,
            decision_id=decision_id,
            title=decision.title,
            decision_text=decision.recommendation,
            reason=decision.reasoning,
            evidence=decision.evidence,
            alternatives=None,
            approver=decision.reviewed_by,
            decision_date=decision.reviewed_at or decision.created_at,
            impact=None,
            tags=[decision.decision_type, decision.status.lower()],
        )
