from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.objective import Objective
    from app.models.user import User


class Job(Base, BaseEntity):
    __tablename__ = "jobs"

    job_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True
    )
    worker: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    error: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)

    user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), default=None, nullable=True
    )
    objective_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), default=None, nullable=True
    )

    user: Mapped[User | None] = relationship(
        "User", back_populates="jobs", lazy="selectin", init=False
    )
    objective: Mapped[Objective | None] = relationship(
        "Objective", back_populates="jobs", lazy="selectin", init=False
    )


Index("ix_jobs_status", Job.status)
Index("ix_jobs_job_type", Job.job_type)
Index("ix_jobs_user_id", Job.user_id)
Index("ix_jobs_objective_id", Job.objective_id)
Index("ix_jobs_created_at", Job.created_at)
Index("ix_jobs_updated_at", Job.updated_at)
Index("ix_jobs_deleted_at", Job.deleted_at)
