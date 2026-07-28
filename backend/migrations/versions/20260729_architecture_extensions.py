"""architecture extensions - objectives compiler, plans, decisions, risks, org, etc.

Revision ID: 20260729_architecture_extensions
Revises: 20260728_initial_schema
Create Date: 2026-07-29 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260729_architecture_extensions"
down_revision: str | None = "20260728_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ─── Objective Compilations (Feature 1) ───────────────────────────────
    op.create_table(
        "objective_compilations",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("mission", sa.Text(), nullable=True),
        sa.Column("vision", sa.Text(), nullable=True),
        sa.Column("business_type", sa.String(100), nullable=True),
        sa.Column("industry", sa.String(200), nullable=True),
        sa.Column("stakeholders", postgresql.JSONB, nullable=True),
        sa.Column("kpis", postgresql.JSONB, nullable=True),
        sa.Column("timeline", postgresql.JSONB, nullable=True),
        sa.Column("budget", postgresql.JSONB, nullable=True),
        sa.Column("dependencies", postgresql.JSONB, nullable=True),
        sa.Column("assumptions", postgresql.JSONB, nullable=True),
        sa.Column("risks", postgresql.JSONB, nullable=True),
        sa.Column("success_metrics", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
    )

    # ─── Plans (Feature 2, 5, 6) ─────────────────────────────────────────
    op.create_table(
        "plans",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("plan_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("roadmap", postgresql.JSONB, nullable=True),
        sa.Column("timeline", postgresql.JSONB, nullable=True),
        sa.Column("total_cost", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
    )

    # ─── Plan Versions (Feature 5 - Adaptive Replanning) ─────────────────
    op.create_table(
        "plan_versions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("changes", postgresql.JSONB, nullable=True),
        sa.Column("diff_summary", sa.Text(), nullable=True),
        sa.Column("snapshot", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
    )

    # ─── Milestones (Feature 2) ──────────────────────────────────────────
    op.create_table(
        "milestones",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dependencies", postgresql.JSONB, nullable=True),
        sa.Column("kpis", postgresql.JSONB, nullable=True),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
    )

    # ─── Departments (Feature 8) ─────────────────────────────────────────
    op.create_table(
        "departments",
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
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("head_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("budget", sa.Float(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
    )

    # ─── Roles (Feature 8) ───────────────────────────────────────────────
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("department_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("responsibilities", postgresql.JSONB, nullable=True),
        sa.Column("required_skills", postgresql.JSONB, nullable=True),
        sa.Column("hiring_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reports_to", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("head_count", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
    )

    # ─── Risks (Feature 2 - Risk Agent) ──────────────────────────────────
    op.create_table(
        "risks",
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
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), nullable=False, server_default="strategic"),
        sa.Column("probability", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("impact", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("risk_level", sa.String(50), nullable=False, server_default="medium"),
        sa.Column("risk_score", sa.Float(), nullable=False, server_default="0.25"),
        sa.Column("mitigation", sa.Text(), nullable=True),
        sa.Column("contingency", sa.Text(), nullable=True),
        sa.Column("owner", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="identified"),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"]),
    )

    # ─── Decisions (Feature 3) ───────────────────────────────────────────
    op.create_table(
        "decisions",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("decision_type", sa.String(100), nullable=False, server_default="strategic"),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("evidence", postgresql.JSONB, nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("risk_level", sa.String(50), nullable=True),
        sa.Column("affected_departments", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
    )

    # ─── Decision Options (Feature 3) ────────────────────────────────────
    op.create_table(
        "decision_options",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("decision_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("pros", postgresql.JSONB, nullable=True),
        sa.Column("cons", postgresql.JSONB, nullable=True),
        sa.Column("risks", postgresql.JSONB, nullable=True),
        sa.Column("cost", sa.Float(), nullable=True),
        sa.Column("timeline_impact", sa.String(255), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("is_recommended", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["decision_id"], ["decisions.id"]),
    )

    # ─── Explanations (Feature 4) ────────────────────────────────────────
    op.create_table(
        "explanations",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("evidence", postgresql.JSONB, nullable=True),
        sa.Column("assumptions", postgresql.JSONB, nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("risk_level", sa.String(50), nullable=True),
        sa.Column("affected_departments", postgresql.JSONB, nullable=True),
        sa.Column("dependencies", postgresql.JSONB, nullable=True),
        sa.Column("model_used", sa.String(255), nullable=True),
    )

    # ─── Scenarios (Feature 6) ───────────────────────────────────────────
    op.create_table(
        "scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("objective_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("base_plan_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parameters", postgresql.JSONB, nullable=False),
        sa.Column("results", postgresql.JSONB, nullable=True),
        sa.Column("comparison", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.ForeignKeyConstraint(["objective_id"], ["objectives.id"]),
        sa.ForeignKeyConstraint(["base_plan_id"], ["plans.id"]),
    )

    # ─── Knowledge Graph (Feature 7) ─────────────────────────────────────
    op.create_table(
        "knowledge_graph_edges",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("source_type", sa.String(100), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("target_type", sa.String(100), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("relationship_type", sa.String(100), nullable=False),
        sa.Column("properties", postgresql.JSONB, nullable=True),
    )

    # ─── KPIs (Feature 1, 8) ─────────────────────────────────────────────
    op.create_table(
        "kpis",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_value", sa.Float(), nullable=False),
        sa.Column("current_value", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(100), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="on_track"),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("entity_type", sa.String(100), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=False), nullable=True),
    )

    op.create_table(
        "kpi_history",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("kpi_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["kpi_id"], ["kpis.id"]),
    )

    # ─── Indexes ─────────────────────────────────────────────────────────
    op.create_index("ix_compilations_objective_id", "objective_compilations", ["objective_id"], unique=True)
    op.create_index("ix_plans_objective_id", "plans", ["objective_id"])
    op.create_index("ix_plans_status", "plans", ["status"])
    op.create_index("ix_plan_versions_plan_id", "plan_versions", ["plan_id"])
    op.create_index("ix_milestones_plan_id", "milestones", ["plan_id"])
    op.create_index("ix_milestones_status", "milestones", ["status"])
    op.create_index("ix_departments_objective_id", "departments", ["objective_id"])
    op.create_index("ix_roles_department_id", "roles", ["department_id"])
    op.create_index("ix_risks_objective_id", "risks", ["objective_id"])
    op.create_index("ix_risks_risk_level", "risks", ["risk_level"])
    op.create_index("ix_risks_status", "risks", ["status"])
    op.create_index("ix_decisions_objective_id", "decisions", ["objective_id"])
    op.create_index("ix_decisions_status", "decisions", ["status"])
    op.create_index("ix_decision_options_decision_id", "decision_options", ["decision_id"])
    op.create_index("ix_explanations_entity_type_entity_id", "explanations", ["entity_type", "entity_id"])
    op.create_index("ix_scenarios_objective_id", "scenarios", ["objective_id"])
    op.create_index("ix_scenarios_status", "scenarios", ["status"])
    op.create_index("ix_graph_edges_source", "knowledge_graph_edges", ["source_type", "source_id"])
    op.create_index("ix_graph_edges_target", "knowledge_graph_edges", ["target_type", "target_id"])
    op.create_index("ix_graph_edges_relationship", "knowledge_graph_edges", ["relationship_type"])
    op.create_index("ix_kpis_entity", "kpis", ["entity_type", "entity_id"])
    op.create_index("ix_kpi_history_kpi_id", "kpi_history", ["kpi_id"])


def downgrade() -> None:
    op.drop_table("kpi_history")
    op.drop_table("kpis")
    op.drop_table("knowledge_graph_edges")
    op.drop_table("scenarios")
    op.drop_table("explanations")
    op.drop_table("decision_options")
    op.drop_table("decisions")
    op.drop_table("risks")
    op.drop_table("roles")
    op.drop_table("departments")
    op.drop_table("milestones")
    op.drop_table("plan_versions")
    op.drop_table("plans")
    op.drop_table("objective_compilations")