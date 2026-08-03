"""executive_workspace

Revision ID: 20260803_executive_workspace
Revises: 20260803_board_sessions
Create Date: 2026-08-03 00:00:00.000000

Adds the Executive Workspace tables: per-executive workspaces with
memory partitions, task tracking, and decision feeds.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260803_executive_workspace"
down_revision: str | None = "20260803_board_sessions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "executive_workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("objective_id", sa.String(), nullable=False),
        sa.Column("executive_role", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, default="active"),
        sa.Column("context", postgresql.JSONB(), nullable=True),
        sa.Column("kpis", postgresql.JSONB(), nullable=True),
    )
    op.create_index(
        "ix_executive_workspaces_objective_id",
        "executive_workspaces",
        ["objective_id"],
    )
    op.create_index(
        "ix_executive_workspaces_executive_role",
        "executive_workspaces",
        ["executive_role"],
    )
    op.create_index(
        "ix_executive_workspaces_objective_role",
        "executive_workspaces",
        ["objective_id", "executive_role"],
        unique=True,
    )

    op.create_table(
        "executive_workspace_items",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, default="open"),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source", postgresql.JSONB(), nullable=True),
    )
    op.create_index(
        "ix_executive_workspace_items_workspace_id",
        "executive_workspace_items",
        ["workspace_id"],
    )
    op.create_index(
        "ix_executive_workspace_items_kind",
        "executive_workspace_items",
        ["kind"],
    )
    op.create_index(
        "ix_executive_workspace_items_status",
        "executive_workspace_items",
        ["status"],
    )

    # Add executive_id column to memory table for partition
    op.add_column(
        "memory",
        sa.Column("executive_id", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_memory_executive_id",
        "memory",
        ["executive_id"],
    )
    op.create_index(
        "ix_memory_objective_executive",
        "memory",
        ["objective_id", "executive_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_memory_objective_executive", table_name="memory")
    op.drop_index("ix_memory_executive_id", table_name="memory")
    op.drop_column("memory", "executive_id")

    op.drop_index("ix_executive_workspace_items_status", table_name="executive_workspace_items")
    op.drop_index("ix_executive_workspace_items_kind", table_name="executive_workspace_items")
    op.drop_index("ix_executive_workspace_items_workspace_id", table_name="executive_workspace_items")
    op.drop_table("executive_workspace_items")

    op.drop_index("ix_executive_workspaces_objective_role", table_name="executive_workspaces")
    op.drop_index("ix_executive_workspaces_executive_role", table_name="executive_workspaces")
    op.drop_index("ix_executive_workspaces_objective_id", table_name="executive_workspaces")
    op.drop_table("executive_workspaces")
