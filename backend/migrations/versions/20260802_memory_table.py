"""memory_table

Revision ID: 20260802_memory_table
Revises: aaf2d53decf5
Create Date: 2026-08-02 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260802_memory_table'
down_revision: Union[str, None] = 'aaf2d53decf5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "memory",
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
        sa.Column("objective_id", sa.String(255), nullable=False),
        sa.Column("embedding", postgresql.JSONB, nullable=True),
        sa.Column("tags", postgresql.JSONB, nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("history", postgresql.JSONB, nullable=True),
    )

    op.create_index("ix_memory_objective_id", "memory", ["objective_id"])
    op.create_index("ix_memory_created_at", "memory", ["created_at"])
    op.create_index("ix_memory_updated_at", "memory", ["updated_at"])
    op.create_index("ix_memory_deleted_at", "memory", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_memory_deleted_at", table_name="memory")
    op.drop_index("ix_memory_updated_at", table_name="memory")
    op.drop_index("ix_memory_created_at", table_name="memory")
    op.drop_index("ix_memory_objective_id", table_name="memory")
    op.drop_table("memory")