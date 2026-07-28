"""features extensions - business readiness, missing info, devils advocate,
success probability, resource gap, dependency graph, bottlenecks, decision memory

Revision ID: 20260730_features_extensions
Revises: 20260729_architecture_extensions
Create Date: 2026-07-30 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260730_features_extensions"
down_revision: str | None = "20260729_architecture_extensions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ─── Business Readiness (Feature 1) ──────────────────────────────────
    op.create_table(
        "business_readiness",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("market_readiness", sa.Float(), nullable=True),
        sa.Column("technical_feasibility", sa.Float(), nullable=True),
        sa.Column("budget_readiness", sa.Float(), nullable=True),
        sa.Column("team_readiness", sa.Float(), nullable=True),
        sa.Column("timeline_feasibility", sa.Float(), nullable=True),
        sa.Column("strengths", postgresql.JSONB, nullable=True),
        sa.Column("weaknesses", postgresql.JSONB, nullable=True),
        sa.Column("recommendations", postgresql.JSONB, nullable=True),
        sa.Column("category_scores", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
    )

    # ─── Missing Info Checks (Feature 2) ─────────────────────────────────
    op.create_table(
        "missing_info_checks",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("missing_fields", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("critical_missing", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("clarification_questions", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("is_complete", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("refinement_round", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("previous_responses", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
    )

    # ─── Devil's Advocate Critiques (Feature 3) ──────────────────────────
    op.create_table(
        "devils_advocate_critiques",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("critique_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("counter_arguments", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("risks", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("assumptions", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("better_alternatives", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("recommendations", postgresql.JSONB, nullable=True),
        sa.Column("model_used", sa.String(255), nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
    )

    # ─── Success Probabilities (Feature 4) ───────────────────────────────
    op.create_table(
        "success_probabilities",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("success_probability", sa.Float(), nullable=False, server_default="0"),
        sa.Column("failure_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("delay_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("budget_overrun_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("team_risk", sa.Float(), nullable=False, server_default="0"),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("risk_factors", postgresql.JSONB, nullable=True),
        sa.Column("mitigating_factors", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
    )

    # ─── Resource Gaps (Feature 5) ───────────────────────────────────────
    op.create_table(
        "resource_gaps",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("missing_roles", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("missing_skills", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("hiring_needs", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("estimated_cost", sa.Float(), nullable=True),
        sa.Column("estimated_hiring_timeline", sa.String(255), nullable=True),
        sa.Column("hiring_priority", postgresql.JSONB, nullable=True),
        sa.Column("available_resources", postgresql.JSONB, nullable=True),
        sa.Column("required_resources", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
    )

    # ─── Dependency Graphs (Feature 6) ───────────────────────────────────
    op.create_table(
        "dependency_graphs",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("nodes", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("edges", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("critical_path", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("circular_dependencies", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("blocked_tasks", postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("cascade_effects", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
    )

    # ─── Bottlenecks (Feature 7) ─────────────────────────────────────────
    op.create_table(
        "bottlenecks",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("bottleneck_type", sa.String(100), nullable=False),
        sa.Column("severity", sa.String(50), nullable=False, server_default="medium"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("root_cause", sa.Text(), nullable=True),
        sa.Column("recommended_resolution", sa.Text(), nullable=True),
        sa.Column("affected_entity_type", sa.String(100), nullable=True),
        sa.Column("affected_entity_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
    )

    # ─── Decision Memory (Feature 9) ─────────────────────────────────────
    op.create_table(
        "decision_memory",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("decision_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("decision_text", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("evidence", postgresql.JSONB, nullable=True),
        sa.Column("alternatives", postgresql.JSONB, nullable=True),
        sa.Column("approver", sa.String(255), nullable=True),
        sa.Column("decision_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("impact", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
        sa.ForeignKeyConstraint(["decision_id"], ["decisions.id"]),
    )

    # ─── Indexes ─────────────────────────────────────────────────────────
    op.create_index("ix_business_readiness_objective_id", "business_readiness", ["objective_id"], unique=True)
    op.create_index("ix_missing_info_objective_id", "missing_info_checks", ["objective_id"], unique=True)
    op.create_index("ix_devils_advocate_objective_id", "devils_advocate_critiques", ["objective_id"])
    op.create_index("ix_success_prob_objective_id", "success_probabilities", ["objective_id"])
    op.create_index("ix_resource_gap_objective_id", "resource_gaps", ["objective_id"])
    op.create_index("ix_dep_graph_objective_id", "dependency_graphs", ["objective_id"], unique=True)
    op.create_index("ix_bottlenecks_objective_id", "bottlenecks", ["objective_id"])
    op.create_index("ix_bottlenecks_type", "bottlenecks", ["bottleneck_type"])
    op.create_index("ix_bottlenecks_severity", "bottlenecks", ["severity"])
    op.create_index("ix_bottlenecks_status", "bottlenecks", ["status"])
    op.create_index("ix_decision_memory_objective_id", "decision_memory", ["objective_id"])
    op.create_index("ix_decision_memory_date", "decision_memory", ["decision_date"])


def downgrade() -> None:
    op.drop_table("decision_memory")
    op.drop_table("bottlenecks")
    op.drop_table("dependency_graphs")
    op.drop_table("resource_gaps")
    op.drop_table("success_probabilities")
    op.drop_table("devils_advocate_critiques")
    op.drop_table("missing_info_checks")
    op.drop_table("business_readiness")
