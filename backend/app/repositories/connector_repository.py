from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connectors import (
    ConnectorAction,
    ConnectorAuditLog,
    ConnectorConfig,
    ConnectorWebhook,
)
from app.repositories.base import BaseRepository


class ConnectorConfigRepository(BaseRepository[ConnectorConfig]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ConnectorConfig)

    async def list_by_provider(self, provider: str) -> list[ConnectorConfig]:
        stmt = select(ConnectorConfig).where(
            ConnectorConfig.provider == provider,
            ConnectorConfig.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_objective(self, objective_id: str) -> list[ConnectorConfig]:
        stmt = select(ConnectorConfig).where(
            ConnectorConfig.objective_id == objective_id,
            ConnectorConfig.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update_status(self, id_: str, status: str, health_status: str | None = None) -> ConnectorConfig | None:
        values: dict[str, Any] = {"status": status}
        if health_status is not None:
            values["health_status"] = health_status
        values["last_health_check"] = datetime.now(UTC)
        return await self.update(id_, values)


class ConnectorActionRepository(BaseRepository[ConnectorAction]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ConnectorAction)

    async def list_by_connector(
        self, connector_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[ConnectorAction]:
        stmt = (
            select(ConnectorAction)
            .where(
                ConnectorAction.connector_id == connector_id,
                ConnectorAction.deleted_at.is_(None),
            )
            .order_by(ConnectorAction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_objective(
        self, objective_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[ConnectorAction]:
        stmt = (
            select(ConnectorAction)
            .where(
                ConnectorAction.objective_id == objective_id,
                ConnectorAction.deleted_at.is_(None),
            )
            .order_by(ConnectorAction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


class ConnectorWebhookRepository(BaseRepository[ConnectorWebhook]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ConnectorWebhook)

    async def list_active(self) -> list[ConnectorWebhook]:
        stmt = select(ConnectorWebhook).where(
            ConnectorWebhook.active == True,  # noqa: E712
            ConnectorWebhook.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_by_connector(self, connector_id: str) -> list[ConnectorWebhook]:
        stmt = select(ConnectorWebhook).where(
            ConnectorWebhook.connector_id == connector_id,
            ConnectorWebhook.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def record_delivery(self, id_: str, status: str, response: str | None = None) -> None:
        stmt = (
            update(ConnectorWebhook)
            .where(ConnectorWebhook.id == id_)
            .values(
                last_delivery=datetime.now(UTC),
                last_status=status,
                last_response=response,
                updated_at=datetime.now(UTC),
            )
        )
        await self._session.execute(stmt)


class ConnectorAuditLogRepository(BaseRepository[ConnectorAuditLog]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ConnectorAuditLog)

    async def list_by_connector(
        self, connector_id: str, *, skip: int = 0, limit: int = 100
    ) -> list[ConnectorAuditLog]:
        stmt = (
            select(ConnectorAuditLog)
            .where(ConnectorAuditLog.connector_id == connector_id)
            .order_by(ConnectorAuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
