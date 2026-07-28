from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.extensions import (
        Decision,
        Department,
        ObjectiveCompilation,
        Plan,
        Risk,
        Scenario,
    )
    from app.models.job import Job
    from app.models.user import User


class Objective(Base, BaseEntity):
    __tablename__ = "objectives"

    raw_input: Mapped[str] = mapped_column(Text, nullable=False)
    compiled_summary: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    structured_goal: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    constraints: Mapped[dict | None] = mapped_column(JSONB, default=None, nullable=True)
    success_criteria: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="draft"
    )
    current_stage: Mapped[str | None] = mapped_column(
        String(100), default=None, nullable=True
    )
    user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), default=None, nullable=True
    )

    user: Mapped[User | None] = relationship(
        "User", back_populates="objectives", lazy="selectin", init=False
    )
    jobs: Mapped[list[Job]] = relationship(
        "Job", back_populates="objective", lazy="selectin", init=False
    )
    compilation: Mapped[ObjectiveCompilation | None] = relationship(
        "ObjectiveCompilation", back_populates="objective", lazy="selectin", init=False, uselist=False
    )
    plans: Mapped[list[Plan]] = relationship(
        "Plan", back_populates="objective", lazy="selectin", init=False
    )
    departments: Mapped[list[Department]] = relationship(
        "Department", back_populates="objective", lazy="selectin", init=False
    )
    risks: Mapped[list[Risk]] = relationship(
        "Risk", back_populates="objective", lazy="selectin", init=False
    )
    decisions: Mapped[list[Decision]] = relationship(
        "Decision", back_populates="objective", lazy="selectin", init=False
    )
    scenarios: Mapped[list[Scenario]] = relationship(
        "Scenario", back_populates="objective", lazy="selectin", init=False
    )


Index("ix_objectives_status", Objective.status)
Index("ix_objectives_user_id", Objective.user_id)
Index("ix_objectives_created_at", Objective.created_at)
Index("ix_objectives_updated_at", Objective.updated_at)
Index("ix_objectives_deleted_at", Objective.deleted_at)
