from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.executive_workspace import (
    ExecutiveWorkspace,
    ExecutiveWorkspaceItem,
)
from app.repositories.base import BaseRepository


class ExecutiveWorkspaceRepository(BaseRepository[ExecutiveWorkspace]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ExecutiveWorkspace)

    async def get_by_objective_and_role(
        self, objective_id: str, executive_role: str
    ) -> ExecutiveWorkspace | None:
        stmt = (
            select(ExecutiveWorkspace)
            .where(
                ExecutiveWorkspace.objective_id == objective_id,
                ExecutiveWorkspace.executive_role == executive_role,
                ExecutiveWorkspace.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_objective(self, objective_id: str) -> list[ExecutiveWorkspace]:
        stmt = (
            select(ExecutiveWorkspace)
            .where(
                ExecutiveWorkspace.objective_id == objective_id,
                ExecutiveWorkspace.deleted_at.is_(None),
            )
            .order_by(ExecutiveWorkspace.executive_role)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_role(self, executive_role: str) -> list[ExecutiveWorkspace]:
        stmt = (
            select(ExecutiveWorkspace)
            .where(
                ExecutiveWorkspace.executive_role == executive_role,
                ExecutiveWorkspace.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class ExecutiveWorkspaceItemRepository(BaseRepository[ExecutiveWorkspaceItem]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ExecutiveWorkspaceItem)

    async def list_by_workspace(
        self,
        workspace_id: str,
        *,
        kind: str | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ExecutiveWorkspaceItem]:
        stmt = (
            select(ExecutiveWorkspaceItem)
            .where(
                ExecutiveWorkspaceItem.workspace_id == workspace_id,
                ExecutiveWorkspaceItem.deleted_at.is_(None),
            )
            .order_by(ExecutiveWorkspaceItem.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if kind:
            stmt = stmt.where(ExecutiveWorkspaceItem.kind == kind)
        if status:
            stmt = stmt.where(ExecutiveWorkspaceItem.status == status)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_workspace(
        self, workspace_id: str, kind: str | None = None, status: str | None = None
    ) -> int:
        stmt = (
            select(ExecutiveWorkspaceItem)
            .where(
                ExecutiveWorkspaceItem.workspace_id == workspace_id,
                ExecutiveWorkspaceItem.deleted_at.is_(None),
            )
        )
        if kind:
            stmt = stmt.where(ExecutiveWorkspaceItem.kind == kind)
        if status:
            stmt = stmt.where(ExecutiveWorkspaceItem.status == status)
        result = await self._session.execute(stmt)
        return len(list(result.scalars().all()))
