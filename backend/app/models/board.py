from __future__ import annotations

from typing import Any

from sqlalchemy import Float, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import BaseEntity


class BoardSession(Base, BaseEntity):
    """An executive board meeting convened against an objective.

    Tracks the multi-round consensus run: roster, brief, and the final
    result (verdict, roll call, conflicts, action items).
    """

    __tablename__ = "board_sessions"

    objective_id: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    rounds: Mapped[int] = mapped_column(nullable=False)
    roster: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True, default=None)
    brief: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    error: Mapped[str | None] = mapped_column(String, nullable=True, default=None)


class ExecutiveMessage(Base, BaseEntity):
    """A single message in a board session transcript."""

    __tablename__ = "executive_messages"

    board_session_id: Mapped[str] = mapped_column(String, nullable=False)
    sender: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    round: Mapped[int] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    recipient: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    content: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    stance: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
