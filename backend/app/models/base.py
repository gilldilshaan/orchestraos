from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column

from app.database.uuid7 import uuid7


def _utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator):
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, _dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class BaseEntity(MappedAsDataclass):
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default_factory=uuid7,
        init=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        default_factory=_utcnow,
        nullable=False,
        init=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        default_factory=_utcnow,
        onupdate=_utcnow,
        nullable=False,
        init=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime,
        default=None,
        nullable=True,
        init=False,
    )
    created_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        default=None,
        nullable=True,
        init=False,
    )
    updated_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        default=None,
        nullable=True,
        init=False,
    )
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        init=False,
    )
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata",
        JSONB,
        default=None,
        nullable=True,
        init=False,
    )
