from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import BaseEntity

if TYPE_CHECKING:
    from app.models.job import Job
    from app.models.objective import Objective


class User(Base, BaseEntity):
    __tablename__ = "users"

    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="viewer")
    organization: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)
    auth_user_id: Mapped[str | None] = mapped_column(
        String(255), default=None, nullable=True
    )

    objectives: Mapped[list[Objective]] = relationship(
        "Objective", back_populates="user", lazy="selectin", init=False
    )
    jobs: Mapped[list[Job]] = relationship(
        "Job", back_populates="user", lazy="selectin", init=False
    )


Index("ix_users_email", User.email, unique=True)
Index("ix_users_role", User.role)
Index("ix_users_created_at", User.created_at)
Index("ix_users_deleted_at", User.deleted_at)
