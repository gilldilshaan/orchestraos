from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.objective import Objective
from app.repositories.base import BaseRepository

TERMINAL_STATUSES = ("completed", "failed", "cancelled")


class ObjectiveRepository(BaseRepository[Objective]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Objective)

    async def count_by_status(self) -> dict[str, int]:
        stmt = (
            select(Objective.status, func.count())
            .where(Objective.deleted_at.is_(None))
            .group_by(Objective.status)
        )
        result = await self._session.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def count_active(self) -> int:
        stmt = select(func.count()).select_from(Objective).where(
            Objective.deleted_at.is_(None),
            Objective.status.notin_(TERMINAL_STATUSES),
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def list_by_user(
        self, user_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Objective]:
        stmt = (
            select(Objective)
            .where(
                Objective.user_id == user_id,
                Objective.deleted_at.is_(None),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_status(
        self, status: str, *, skip: int = 0, limit: int = 100
    ) -> list[Objective]:
        stmt = (
            select(Objective)
            .where(
                Objective.status == status,
                Objective.deleted_at.is_(None),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
