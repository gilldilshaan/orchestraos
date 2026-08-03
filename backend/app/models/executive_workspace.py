from __future__ import annotations

from typing import Any

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import BaseEntity


class ExecutiveWorkspace(Base, BaseEntity):
    """A per-executive workspace within an objective.

    Each executive role (CEO, Finance, Engineering, etc.) gets their own
    workspace within an objective, with isolated memory partitions,
    task tracking, and decision feeds.
    """

    __tablename__ = "executive_workspaces"

    objective_id: Mapped[str] = mapped_column(String, nullable=False)
    executive_role: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    context: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    kpis: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


class ExecutiveWorkspaceItem(Base, BaseEntity):
    """An item within an executive workspace (task, decision, note, etc.)."""

    __tablename__ = "executive_workspace_items"

    workspace_id: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str | None] = mapped_column(String, nullable=True)
    priority: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    due_at: Mapped[Any | None] = mapped_column(nullable=True)
    source: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
