"""board_sessions

Revision ID: 20260803_board_sessions
Revises: 20260803_memory_content_jsonb
Create Date: 2026-08-03 00:00:00.000000

Adds the Executive Collaboration Engine tables: a board session (a meeting
of AI executives debating an objective) and the executive messages that form
its transcript.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260803_board_sessions"
down_revision: str | None = "20260803_memory_content_jsonb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "board_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("objective_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("topic", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("roster", postgresql.JSONB(), nullable=True),
        sa.Column("rounds", sa.Integer(), nullable=False),
        sa.Column("brief", postgresql.JSONB(), nullable=True),
        sa.Column("result", postgresql.JSONB(), nullable=True),
        sa.Column("error", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_board_sessions_objective_id",
        "board_sessions",
        ["objective_id"],
    )

    op.create_table(
        "executive_messages",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("board_session_id", sa.String(), nullable=False),
        sa.Column("sender", sa.String(), nullable=False),
        sa.Column("recipient", sa.String(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("round", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("stance", sa.String(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
    )
    op.create_index(
        "ix_executive_messages_board_session_id",
        "executive_messages",
        ["board_session_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_executive_messages_board_session_id", table_name="executive_messages")
    op.drop_table("executive_messages")
    op.drop_index("ix_board_sessions_objective_id", table_name="board_sessions")
    op.drop_table("board_sessions")
