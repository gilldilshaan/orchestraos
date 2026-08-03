from __future__ import annotations

from typing import Any

from sqlalchemy import Float, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import BaseEntity


class Memory(Base, BaseEntity):
    """Organizational memory for objective contexts."""

    __tablename__ = "memory"

    objective_id: Mapped[str] = mapped_column(String, nullable=False)
    executive_id: Mapped[str | None] = mapped_column(String, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(JSONB, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    content: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    history: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
