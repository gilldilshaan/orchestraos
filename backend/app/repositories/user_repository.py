from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(
            User.email == email,
            User.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_role(self, role: str, *, skip: int = 0, limit: int = 100) -> list[User]:
        stmt = (
            select(User)
            .where(User.role == role, User.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_or_create(self, email: str, defaults: dict[str, Any]) -> tuple[User, bool]:
        existing = await self.get_by_email(email)
        if existing is not None:
            return existing, False
        user = User(email=email, **defaults)
        return await self.create(user), True
