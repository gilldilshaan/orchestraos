"""initial schema

Revision ID: 20260728_initial_schema
Revises:
Create Date: 2026-07-28 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260728_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgvector"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="viewer"),
        sa.Column("organization", sa.String(255), nullable=True),
        sa.Column("auth_user_id", sa.String(255), nullable=True),
    )

    op.create_table(
        "objectives",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("raw_input", sa.Text(), nullable=False),
        sa.Column("compiled_summary", sa.Text(), nullable=True),
        sa.Column("structured_goal", sa.Text(), nullable=True),
        sa.Column("constraints", postgresql.JSONB, nullable=True),
        sa.Column("success_criteria", postgresql.JSONB, nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("current_stage", sa.String(100), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=True),
    )

    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("job_type", sa.String(100), nullable=False),
        sa.Column(
            "status", sa.String(50), nullable=False, server_default="pending"
        ),
        sa.Column("progress", sa.Float(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("worker", sa.String(255), nullable=True),
        sa.Column("result", postgresql.JSONB, nullable=True),
        sa.Column("error", postgresql.JSONB, nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column(
            "objective_id", postgresql.UUID(as_uuid=False), nullable=True
        ),
    )

    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_created_at", "users", ["created_at"])
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])

    op.create_index("ix_objectives_status", "objectives", ["status"])
    op.create_index("ix_objectives_user_id", "objectives", ["user_id"])
    op.create_index("ix_objectives_created_at", "objectives", ["created_at"])
    op.create_index("ix_objectives_updated_at", "objectives", ["updated_at"])
    op.create_index("ix_objectives_deleted_at", "objectives", ["deleted_at"])

    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_job_type", "jobs", ["job_type"])
    op.create_index("ix_jobs_user_id", "jobs", ["user_id"])
    op.create_index("ix_jobs_objective_id", "jobs", ["objective_id"])
    op.create_index("ix_jobs_created_at", "jobs", ["created_at"])
    op.create_index("ix_jobs_updated_at", "jobs", ["updated_at"])
    op.create_index("ix_jobs_deleted_at", "jobs", ["deleted_at"])


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_table("objectives")
    op.drop_table("users")
    op.execute('DROP EXTENSION IF EXISTS "pgvector"')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
    op.execute('DROP EXTENSION IF EXISTS "pgcrypto"')
