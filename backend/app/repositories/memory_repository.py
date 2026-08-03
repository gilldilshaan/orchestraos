from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import Memory
from app.repositories.base import BaseRepository


class MemoryRepository(BaseRepository[Memory]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Memory)

    async def get_many(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        objective_id: str | None = None,
    ) -> list[Memory]:
        stmt = select(Memory).where(Memory.deleted_at.is_(None))
        if objective_id:
            stmt = stmt.where(Memory.objective_id == objective_id)
        stmt = stmt.order_by(Memory.created_at.desc()).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_objective(self, objective_id: str) -> list[Memory]:
        stmt = (
            select(Memory)
            .where(
                Memory.objective_id == objective_id,
                Memory.deleted_at.is_(None),
            )
            .order_by(Memory.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_executive(self, executive_id: str) -> list[Memory]:
        stmt = (
            select(Memory)
            .where(
                Memory.executive_id == executive_id,
                Memory.deleted_at.is_(None),
            )
            .order_by(Memory.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_all(self, *, objective_id: str | None = None) -> list[Memory]:
        """Return every non-deleted memory row (no pagination)."""
        stmt = select(Memory).where(Memory.deleted_at.is_(None))
        if objective_id:
            stmt = stmt.where(Memory.objective_id == objective_id)
        stmt = stmt.order_by(Memory.created_at.asc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **data: Any) -> Memory:
        entity = Memory(**data)
        await super().create(entity)
        return entity

    async def update(self, id_: str, **data: Any) -> Memory | None:
        return await super().update(id_, data)

    async def delete(self, id_: str) -> bool:
        return await super().soft_delete(id_)
