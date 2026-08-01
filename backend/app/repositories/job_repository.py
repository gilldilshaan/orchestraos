from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.repositories.base import BaseRepository


class JobRepository(BaseRepository[Job]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Job)

    async def list_by_user(
        self, user_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Job]:
        stmt = (
            select(Job)
            .where(Job.user_id == user_id, Job.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[Job]:
        stmt = (
            select(Job)
            .where(
                Job.objective_id == objective_id,
                Job.deleted_at.is_(None),
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_status(
        self, status: str, *, skip: int = 0, limit: int = 100
    ) -> list[Job]:
        stmt = (
            select(Job)
            .where(Job.status == status, Job.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_pending(self, *, limit: int = 50) -> list[Job]:
        stmt = (
            select(Job)
            .where(Job.status == "pending", Job.deleted_at.is_(None))
            .order_by(Job.created_at.asc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def mark_started(self, id_: str, worker: str) -> Job | None:
        return await self.update(
            id_,
            {
                "status": "running",
                "started_at": datetime.utcnow(),
                "worker": worker,
            },
        )

    async def mark_completed(
        self, id_: str, result: dict[str, Any] | None = None
    ) -> Job | None:
        return await self.update(
            id_,
            {
                "status": "completed",
                "progress": 100.0,
                "finished_at": datetime.utcnow(),
                "result": result,
            },
        )

    async def mark_failed(self, id_: str, error: dict[str, Any] | None = None) -> Job | None:
        return await self.update(
            id_,
            {
                "status": "failed",
                "finished_at": datetime.utcnow(),
                "error": error,
            },
        )
