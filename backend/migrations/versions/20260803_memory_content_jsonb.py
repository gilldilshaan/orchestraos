"""memory_content_jsonb

Revision ID: 20260803_memory_content_jsonb
Revises: 20260802_memory_table
Create Date: 2026-08-03 00:00:00.000000

Stores memory ``content`` (structured extraction: summary, strategy, lessons,
risks, decisions, success_factors) as JSONB instead of plain text so the
service layer can read/write it as structured data.

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260803_memory_content_jsonb"
down_revision: str | None = "20260802_memory_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "memory",
        "content",
        existing_type=sa.Text(),
        type_=postgresql.JSONB(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "memory",
        "content",
        existing_type=postgresql.JSONB(),
        type_=sa.Text(),
        nullable=True,
    )
