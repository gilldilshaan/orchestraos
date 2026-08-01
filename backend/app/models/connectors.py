from __future__ import annotations

from datetime import datetime
from typing import Any, cast

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import BaseEntity, UTCDateTime


class ConnectorConfig(Base, BaseEntity):
    __tablename__ = "connector_configs"

    objective_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=True, index=True, default=None
    )
    provider: Mapped[str] = mapped_column(String(100), nullable=False, index=True, default="")
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    auth_type: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    credentials_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    config: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="disconnected")
    last_health_check: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)
    health_status: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB, nullable=True, default=None, init=False)
    version: Mapped[str] = cast(
        Mapped[str], mapped_column(String(20), nullable=False, default="1.0", init=False)
    )


class ConnectorAction(Base, BaseEntity):
    __tablename__ = "connector_actions"

    connector_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("connector_configs.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    objective_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=True, default=None, index=True
    )
    params: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    error: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)
    duration_ms: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ConnectorWebhook(Base, BaseEntity):
    __tablename__ = "connector_webhooks"

    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    connector_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("connector_configs.id"), nullable=True, default=None, index=True
    )
    objective_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=True, default=None, index=True
    )
    method: Mapped[str] = mapped_column(String(10), nullable=False, default="POST")
    headers: Mapped[dict[str, str] | None] = mapped_column(JSONB, nullable=True, default=None)
    secret: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    events: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True, default=None)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    last_delivery: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)
    last_status: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    last_response: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ConnectorAuditLog(Base, BaseEntity):
    __tablename__ = "connector_audit_logs"

    connector_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("connector_configs.id"), nullable=False, index=True
    )
    action_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("connector_actions.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    target: Mapped[str] = mapped_column(String(500), nullable=False)
    result: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True, default=None)


Index("ix_connector_actions_connector", ConnectorAction.connector_id, ConnectorAction.created_at)
Index("ix_connector_audit_connector", ConnectorAuditLog.connector_id, ConnectorAuditLog.created_at)
Index("ix_connector_webhooks_events", ConnectorWebhook.events, postgresql_using="gin")
Index("ix_connector_configs_provider_status", ConnectorConfig.provider, ConnectorConfig.status)
