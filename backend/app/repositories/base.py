from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Generic, TypeVar

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.models.base import BaseEntity

T = TypeVar("T", bound="BaseEntity")


class BaseRepository(Generic[T]):
    def __init__(self, session: AsyncSession, model: type[T]) -> None:
        self._session = session
        self._model = model

    async def create(self, entity: T) -> T:
        self._session.add(entity)
        await self._session.flush()
        return entity

    async def get(self, id_: str) -> T | None:
        stmt = select(self._model).where(
            self._model.id == id_,
            self._model.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_ids(self, ids: list[str]) -> list[T]:
        stmt = select(self._model).where(
            self._model.id.in_(ids),
            self._model.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str | None = None,
        descending: bool = False,
    ) -> list[T]:
        stmt = select(self._model).where(self._model.deleted_at.is_(None))
        if order_by is not None:
            column = getattr(self._model, order_by, None)
            if column is not None:
                stmt = stmt.order_by(column.desc() if descending else column.asc())
        stmt = stmt.offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, id_: str, values: dict[str, Any]) -> T | None:
        values["updated_at"] = datetime.now(UTC)
        values["version"] = self._model.version + 1
        stmt = (
            update(self._model)
            .where(
                self._model.id == id_,
                self._model.deleted_at.is_(None),
            )
            .values(**values)
            .returning(self._model)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def soft_delete(self, id_: str) -> bool:
        stmt = (
            update(self._model)
            .where(
                self._model.id == id_,
                self._model.deleted_at.is_(None),
            )
            .values(
                deleted_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )
        result = await self._session.execute(stmt)
        return result.rowcount > 0

    async def count(self, filters: dict[str, Any] | None = None) -> int:
        stmt = select(func.count()).select_from(self._model).where(
            self._model.deleted_at.is_(None)
        )
        if filters:
            for key, value in filters.items():
                column = getattr(self._model, key, None)
                if column is not None:
                    stmt = stmt.where(column == value)
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def exists(self, id_: str) -> bool:
        stmt = select(self._model).where(
            self._model.id == id_,
            self._model.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None
