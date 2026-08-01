from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import BaseEntity, UTCDateTime


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ObjectiveCompilation(Base, BaseEntity):
    __tablename__ = "objective_compilations"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), unique=True, nullable=False
    )
    mission: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    vision: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    business_type: Mapped[str | None] = mapped_column(String(100), default=None, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(200), default=None, nullable=True)
    stakeholders: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    kpis: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    timeline: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    budget: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    dependencies: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    assumptions: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    risks: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    success_metrics: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)

    objective: Mapped[Objective | None] = relationship(
        "Objective", back_populates="compilation", lazy="selectin", init=False
    )


class Plan(Base, BaseEntity):
    __tablename__ = "plans"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    plan_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    roadmap: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    timeline: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    total_cost: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)

    objective: Mapped[Objective | None] = relationship(
        "Objective", back_populates="plans", lazy="selectin", init=False
    )
    milestones: Mapped[list[Milestone]] = relationship(
        "Milestone", back_populates="plan", lazy="selectin", init=False
    )
    versions: Mapped[list[PlanVersion]] = relationship(
        "PlanVersion", back_populates="plan", lazy="selectin", init=False
    )


class PlanVersion(Base, BaseEntity):
    __tablename__ = "plan_versions"

    plan_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    changes: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    diff_summary: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)

    plan: Mapped[Plan | None] = relationship(
        "Plan", back_populates="versions", lazy="selectin", init=False
    )


class Milestone(Base, BaseEntity):
    __tablename__ = "milestones"

    plan_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(
        UTCDateTime, default=None, nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dependencies: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    kpis: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)

    plan: Mapped[Plan | None] = relationship(
        "Plan", back_populates="milestones", lazy="selectin", init=False
    )


class Department(Base, BaseEntity):
    __tablename__ = "departments"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), default=None, nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    head_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    budget: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    objective: Mapped[Objective | None] = relationship(
        "Objective", back_populates="departments", lazy="selectin", init=False
    )
    roles: Mapped[list[Role]] = relationship(
        "Role", back_populates="department", lazy="selectin", init=False
    )


class Role(Base, BaseEntity):
    __tablename__ = "roles"

    department_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("departments.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    responsibilities: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    required_skills: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    hiring_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reports_to: Mapped[str | None] = mapped_column(
        String(255), default=None, nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    head_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    department: Mapped[Department | None] = relationship(
        "Department", back_populates="roles", lazy="selectin", init=False
    )


class Risk(Base, BaseEntity):
    __tablename__ = "risks"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), default=None, nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="strategic", nullable=False)
    probability: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    impact: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0.25, nullable=False)
    mitigation: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    contingency: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    owner: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="identified", nullable=False)

    objective: Mapped[Objective | None] = relationship(
        "Objective", back_populates="risks", lazy="selectin", init=False
    )


class Decision(Base, BaseEntity):
    __tablename__ = "decisions"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    decision_type: Mapped[str] = mapped_column(String(100), default="strategic", nullable=False)
    recommendation: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    reasoning: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    evidence: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(50), default=None, nullable=True)
    affected_departments: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    reviewed_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), default=None, nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, default=None, nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)

    objective: Mapped[Objective | None] = relationship(
        "Objective", back_populates="decisions", lazy="selectin", init=False
    )
    options: Mapped[list[DecisionOption]] = relationship(
        "DecisionOption", back_populates="decision", lazy="selectin", init=False
    )


class DecisionOption(Base, BaseEntity):
    __tablename__ = "decision_options"

    decision_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("decisions.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    pros: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    cons: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    risks: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    cost: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    timeline_impact: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    is_recommended: Mapped[bool] = mapped_column(default=False, nullable=False)

    decision: Mapped[Decision | None] = relationship(
        "Decision", back_populates="options", lazy="selectin", init=False
    )


class Explanation(Base, BaseEntity):
    __tablename__ = "explanations"

    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), nullable=False
    )
    recommendation: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    reasoning: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    evidence: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    assumptions: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(50), default=None, nullable=True)
    affected_departments: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    dependencies: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)


class Scenario(Base, BaseEntity):
    __tablename__ = "scenarios"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    base_plan_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), default=None, nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    results: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    comparison: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)

    objective: Mapped[Objective | None] = relationship(
        "Objective", back_populates="scenarios", lazy="selectin", init=False
    )


class KnowledgeGraphEdge(Base, BaseEntity):
    __tablename__ = "knowledge_graph_edges"

    source_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), nullable=False
    )
    target_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(String(100), nullable=False)
    properties: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)


class KPI(Base, BaseEntity):
    __tablename__ = "kpis"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_value: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    current_value: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(100), default=None, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="on_track", nullable=False)
    measured_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, default=None, nullable=True
    )
    entity_type: Mapped[str | None] = mapped_column(String(100), default=None, nullable=True)
    entity_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), default=None, nullable=True
    )


class KPIHistory(Base, BaseEntity):
    __tablename__ = "kpi_history"

    kpi_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("kpis.id"), nullable=False
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    measured_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default_factory=_utcnow, nullable=False
    )


# ─── Execution Artifact Models ─────────────────────────────────────────────

class StoredExecutionEvent(Base, BaseEntity):
    """Persisted execution event for replay and timeline."""

    __tablename__ = "execution_events"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, index=True
    )
    stage: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    event_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class AgentTelemetry(Base, BaseEntity):
    """Per-agent execution telemetry record."""

    __tablename__ = "agent_telemetry"

    # ── Required fields (no defaults) ─────────────────────────────────────
    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, index=True
    )
    agent_id: Mapped[str] = mapped_column(String(100), nullable=False)
    stage: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)

    # ── Optional fields ───────────────────────────────────────────────────
    agent_name: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)
    role: Mapped[str | None] = mapped_column(String(100), default=None, nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)

    # Runtime
    start_time: Mapped[datetime | None] = mapped_column(UTCDateTime, default=None, nullable=True)
    finish_time: Mapped[datetime | None] = mapped_column(UTCDateTime, default=None, nullable=True)
    runtime_ms: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)

    # Model
    provider: Mapped[str | None] = mapped_column(String(100), default=None, nullable=True)
    model: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    max_tokens: Mapped[int | None] = mapped_column(Integer, default=None, nullable=True)

    # LLM Usage
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, default=None, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, default=None, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, default=None, nullable=True)

    # Cost
    input_cost: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    output_cost: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    total_cost: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)

    # Execution
    retries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    timeout_seconds: Mapped[int | None] = mapped_column(Integer, default=None, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)

    # Dependencies
    parent_agents: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    child_agents: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    upstream: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    downstream: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)

    # Tool Calls
    tool_calls: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)

    # Outputs
    reasoning_summary: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    decision_summary: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    artifacts_produced: Mapped[list[Any] | None] = mapped_column(JSONB, default=None, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    output_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None, nullable=True)


class ExecutionSnapshot(Base, BaseEntity):
    """Immutable snapshot of a completed execution for artifact store."""

    __tablename__ = "execution_snapshots"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, index=True, unique=True
    )
    snapshot_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    snapshot_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


# Forward reference for relationships
from app.models.objective import Objective  # noqa: E402

# ─── Sprint 8: Agent Communication ────────────────────────────────────────────


class AgentMessage(Base, BaseEntity):
    __tablename__ = "agent_messages"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, index=True
    )
    from_agent: Mapped[str] = mapped_column(String(100), nullable=False)
    to_agent: Mapped[str] = mapped_column(String(100), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), nullable=False, default="reply")
    body: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    parent_message_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("agent_messages.id"), nullable=True, default=None, index=True
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="sent", index=True)
    read_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)


# ─── Sprint 8: Agent Conflicts ────────────────────────────────────────────────


class AgentConflict(Base, BaseEntity):
    __tablename__ = "agent_conflicts"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, index=True
    )
    agent_a: Mapped[str] = mapped_column(String(100), nullable=False)
    agent_b: Mapped[str] = mapped_column(String(100), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    disagreement: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_a: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True, default=None)
    evidence_b: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True, default=None)
    alternatives: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True, default=None)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    resolved_by: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    resolved_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open", index=True)


# ─── Sprint 8: Approval Gates ─────────────────────────────────────────────────


class ApprovalGate(Base, BaseEntity):
    __tablename__ = "approval_gates"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, index=True
    )
    gate_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    proposed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    reviewed_by: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)
    execution_paused: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


# ─── Sprint 8: Execution Checkpoints ──────────────────────────────────────────


class ExecutionCheckpoint(Base, BaseEntity):
    __tablename__ = "execution_checkpoints"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, unique=True, index=True
    )
    checkpoint_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    completed_steps: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    current_step: Mapped[str | None] = mapped_column(String(200), nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="in_progress", index=True)
    cursor: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    resume_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_resumed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


# ─── Sprint 8: Watchdog Alerts ────────────────────────────────────────────────


class WatchdogAlert(Base, BaseEntity):
    __tablename__ = "watchdog_alerts"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, index=True
    )
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(2000), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), nullable=False, default="warning")
    details: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True, default=None)


# ─── Sprint 8: Self-Healing Actions ───────────────────────────────────────────


class SelfHealingAction(Base, BaseEntity):
    __tablename__ = "self_healing_actions"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False, index=True
    )
    trigger_event: Mapped[str] = mapped_column(String(500), nullable=False)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target: Mapped[str] = mapped_column(String(200), nullable=False)
    result: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True, default=None)
    duration_ms: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)


# ─── Indexes ─────────────────────────────────────────────────────────────────

Index("ix_compilations_objective_id", ObjectiveCompilation.objective_id, unique=True)
Index("ix_plans_objective_id", Plan.objective_id)
Index("ix_plans_status", Plan.status)
Index("ix_plan_versions_plan_id", PlanVersion.plan_id)
Index("ix_milestones_plan_id", Milestone.plan_id)
Index("ix_milestones_status", Milestone.status)
Index("ix_departments_objective_id", Department.objective_id)
Index("ix_roles_department_id", Role.department_id)
Index("ix_risks_objective_id", Risk.objective_id)
Index("ix_risks_risk_level", Risk.risk_level)
Index("ix_risks_status", Risk.status)
Index("ix_decisions_objective_id", Decision.objective_id)
Index("ix_decisions_status", Decision.status)
Index("ix_decision_options_decision_id", DecisionOption.decision_id)
Index("ix_explanations_entity_type_entity_id", Explanation.entity_type, Explanation.entity_id)
Index("ix_scenarios_objective_id", Scenario.objective_id)
Index("ix_scenarios_status", Scenario.status)
Index("ix_graph_edges_source", KnowledgeGraphEdge.source_type, KnowledgeGraphEdge.source_id)
Index("ix_graph_edges_target", KnowledgeGraphEdge.target_type, KnowledgeGraphEdge.target_id)
Index("ix_graph_edges_relationship", KnowledgeGraphEdge.relationship_type)
Index("ix_kpis_entity", KPI.entity_type, KPI.entity_id)
Index("ix_kpi_history_kpi_id", KPIHistory.kpi_id)
Index(
    "ix_execution_events_objective",
    StoredExecutionEvent.objective_id,
    StoredExecutionEvent.event_order,
)
Index("ix_agent_telemetry_objective", AgentTelemetry.objective_id, AgentTelemetry.agent_id)
Index("ix_agent_telemetry_stage", AgentTelemetry.objective_id, AgentTelemetry.stage)
Index("ix_execution_snapshots_objective", ExecutionSnapshot.objective_id, unique=True)
