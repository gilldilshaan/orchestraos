from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.board import BoardSession, ExecutiveMessage
from app.repositories.base import BaseRepository


class BoardSessionRepository(BaseRepository[BoardSession]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, BoardSession)

    async def list_sessions(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> list[BoardSession]:
        stmt = (
            select(BoardSession)
            .where(BoardSession.deleted_at.is_(None))
            .order_by(BoardSession.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_objective(self, objective_id: str) -> list[BoardSession]:
        objective_id = str(objective_id)
        stmt = (
            select(BoardSession)
            .where(
                BoardSession.objective_id == objective_id,
                BoardSession.deleted_at.is_(None),
            )
            .order_by(BoardSession.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class ExecutiveMessageRepository(BaseRepository[ExecutiveMessage]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ExecutiveMessage)

    async def list_by_session(
        self,
        board_session_id: str,
        *,
        skip: int = 0,
        limit: int = 500,
    ) -> list[ExecutiveMessage]:
        board_session_id = str(board_session_id)
        stmt = (
            select(ExecutiveMessage)
            .where(
                ExecutiveMessage.board_session_id == board_session_id,
                ExecutiveMessage.deleted_at.is_(None),
            )
            .order_by(ExecutiveMessage.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_session(self, board_session_id: str) -> int:
        board_session_id = str(board_session_id)
        stmt = (
            select(ExecutiveMessage)
            .where(
                ExecutiveMessage.board_session_id == board_session_id,
                ExecutiveMessage.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return len(list(result.scalars().all()))
