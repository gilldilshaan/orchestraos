from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.models.extensions import (
    AgentConflict,
    AgentMessage,
    ApprovalGate,
    ExecutionCheckpoint,
    SelfHealingAction,
    WatchdogAlert,
)
from app.repositories.base import BaseRepository


class AgentMessageRepository(BaseRepository[AgentMessage]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, AgentMessage)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[AgentMessage]:
        stmt = (
            select(AgentMessage)
            .where(
                AgentMessage.objective_id == objective_id,
                AgentMessage.deleted_at.is_(None),
            )
            .order_by(AgentMessage.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_conversation(
        self, objective_id: str, from_agent: str, to_agent: str
    ) -> list[AgentMessage]:
        stmt = (
            select(AgentMessage)
            .where(
                AgentMessage.objective_id == objective_id,
                AgentMessage.deleted_at.is_(None),
            )
            .where(
                (AgentMessage.from_agent == from_agent)
                & (AgentMessage.to_agent == to_agent)
                | (AgentMessage.from_agent == to_agent)
                & (AgentMessage.to_agent == from_agent)
            )
            .order_by(AgentMessage.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def mark_read(self, message_id: str) -> AgentMessage | None:
        stmt = (
            update(AgentMessage)
            .where(
                AgentMessage.id == message_id,
                AgentMessage.deleted_at.is_(None),
            )
            .values(
                status="read",
                read_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            .returning(AgentMessage)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_unread(self, objective_id: str, agent: str) -> int:
        stmt = (
            select(func.count())
            .select_from(AgentMessage)
            .where(
                AgentMessage.objective_id == objective_id,
                AgentMessage.to_agent == agent,
                AgentMessage.status == "sent",
                AgentMessage.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0


class AgentConflictRepository(BaseRepository[AgentConflict]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, AgentConflict)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[AgentConflict]:
        stmt = (
            select(AgentConflict)
            .where(
                AgentConflict.objective_id == objective_id,
                AgentConflict.deleted_at.is_(None),
            )
            .order_by(AgentConflict.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_open(self, objective_id: str) -> list[AgentConflict]:
        stmt = (
            select(AgentConflict)
            .where(
                AgentConflict.objective_id == objective_id,
                AgentConflict.status == "open",
                AgentConflict.deleted_at.is_(None),
            )
            .order_by(AgentConflict.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def resolve(
        self, conflict_id: str, resolution: str, resolved_by: str
    ) -> AgentConflict | None:
        stmt = (
            update(AgentConflict)
            .where(
                AgentConflict.id == conflict_id,
                AgentConflict.deleted_at.is_(None),
            )
            .values(
                status="resolved",
                resolution=resolution,
                resolved_by=resolved_by,
                resolved_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            .returning(AgentConflict)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class ApprovalGateRepository(BaseRepository[ApprovalGate]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ApprovalGate)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[ApprovalGate]:
        stmt = (
            select(ApprovalGate)
            .where(
                ApprovalGate.objective_id == objective_id,
                ApprovalGate.deleted_at.is_(None),
            )
            .order_by(ApprovalGate.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_pending(self, objective_id: str) -> list[ApprovalGate]:
        stmt = (
            select(ApprovalGate)
            .where(
                ApprovalGate.objective_id == objective_id,
                ApprovalGate.status == "pending",
                ApprovalGate.deleted_at.is_(None),
            )
            .order_by(ApprovalGate.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def review(
        self, gate_id: str, status: str, reviewed_by: str, notes: str | None = None
    ) -> ApprovalGate | None:
        stmt = (
            update(ApprovalGate)
            .where(
                ApprovalGate.id == gate_id,
                ApprovalGate.deleted_at.is_(None),
            )
            .values(
                status=status,
                reviewed_by=reviewed_by,
                reviewed_at=datetime.now(UTC),
                review_notes=notes,
                execution_paused=False,
                updated_at=datetime.now(UTC),
            )
            .returning(ApprovalGate)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class ExecutionCheckpointRepository(BaseRepository[ExecutionCheckpoint]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ExecutionCheckpoint)

    async def get_by_objective(self, objective_id: str) -> ExecutionCheckpoint | None:
        stmt = select(ExecutionCheckpoint).where(
            ExecutionCheckpoint.objective_id == objective_id,
            ExecutionCheckpoint.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, objective_id: str, values: dict[str, Any]) -> ExecutionCheckpoint:
        existing = await self.get_by_objective(objective_id)
        if existing:
            values["updated_at"] = datetime.now(UTC)
            stmt = (
                update(ExecutionCheckpoint)
                .where(ExecutionCheckpoint.id == existing.id)
                .values(**values)
                .returning(ExecutionCheckpoint)
            )
            result = await self._session.execute(stmt)
            return result.scalar_one()
        checkpoint = ExecutionCheckpoint(objective_id=objective_id, **values)
        self._session.add(checkpoint)
        await self._session.flush()
        return checkpoint


class WatchdogAlertRepository(BaseRepository[WatchdogAlert]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, WatchdogAlert)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[WatchdogAlert]:
        stmt = (
            select(WatchdogAlert)
            .where(
                WatchdogAlert.objective_id == objective_id,
                WatchdogAlert.deleted_at.is_(None),
            )
            .order_by(WatchdogAlert.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_unresolved(self, objective_id: str) -> list[WatchdogAlert]:
        stmt = (
            select(WatchdogAlert)
            .where(
                WatchdogAlert.objective_id == objective_id,
                WatchdogAlert.resolved == False,  # noqa: E712
                WatchdogAlert.deleted_at.is_(None),
            )
            .order_by(WatchdogAlert.severity.desc(), WatchdogAlert.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def acknowledge(self, alert_id: str) -> WatchdogAlert | None:
        stmt = (
            update(WatchdogAlert)
            .where(
                WatchdogAlert.id == alert_id,
                WatchdogAlert.deleted_at.is_(None),
            )
            .values(
                acknowledged=True,
                acknowledged_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            .returning(WatchdogAlert)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def resolve_alert(self, alert_id: str) -> WatchdogAlert | None:
        stmt = (
            update(WatchdogAlert)
            .where(
                WatchdogAlert.id == alert_id,
                WatchdogAlert.deleted_at.is_(None),
            )
            .values(
                resolved=True,
                resolved_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            .returning(WatchdogAlert)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_unresolved(self) -> int:
        stmt = (
            select(func.count())
            .select_from(WatchdogAlert)
            .where(
                WatchdogAlert.resolved == False,  # noqa: E712
                WatchdogAlert.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def count_unresolved_by_objective(self, objective_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(WatchdogAlert)
            .where(
                WatchdogAlert.objective_id == objective_id,
                WatchdogAlert.resolved == False,  # noqa: E712
                WatchdogAlert.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0


class SelfHealingActionRepository(BaseRepository[SelfHealingAction]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SelfHealingAction)

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[SelfHealingAction]:
        stmt = (
            select(SelfHealingAction)
            .where(
                SelfHealingAction.objective_id == objective_id,
                SelfHealingAction.deleted_at.is_(None),
            )
            .order_by(SelfHealingAction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_result(self, objective_id: str, result: str) -> int:
        stmt = (
            select(func.count())
            .select_from(SelfHealingAction)
            .where(
                SelfHealingAction.objective_id == objective_id,
                SelfHealingAction.result == result,
                SelfHealingAction.deleted_at.is_(None),
            )
        )
        result_ = await self._session.execute(stmt)
        return result_.scalar() or 0
