from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.base import BaseEntity, UTCDateTime


def _utcnow() -> datetime:
    return datetime.now(UTC)


class BusinessReadiness(Base, BaseEntity):
    __tablename__ = "business_readiness"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    overall_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    market_readiness: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    technical_feasibility: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    budget_readiness: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    team_readiness: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    timeline_feasibility: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    strengths: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    weaknesses: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    recommendations: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    category_scores: Mapped[dict | None] = mapped_column(JSONB, default=None, nullable=True)


class MissingInfoCheck(Base, BaseEntity):
    __tablename__ = "missing_info_checks"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    missing_fields: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    critical_missing: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    clarification_questions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    is_complete: Mapped[bool] = mapped_column(default=False, nullable=False)
    refinement_round: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    previous_responses: Mapped[dict | None] = mapped_column(JSONB, default=None, nullable=True)


class DevilsAdvocateCritique(Base, BaseEntity):
    __tablename__ = "devils_advocate_critiques"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    plan_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), default=None, nullable=True
    )
    critique_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    counter_arguments: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    risks: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    assumptions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    better_alternatives: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    recommendations: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)


class SuccessProbability(Base, BaseEntity):
    __tablename__ = "success_probabilities"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    plan_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), default=None, nullable=True
    )
    success_probability: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    failure_risk: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    delay_risk: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    budget_overrun_risk: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    team_risk: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reasoning: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    risk_factors: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    mitigating_factors: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)


class ResourceGap(Base, BaseEntity):
    __tablename__ = "resource_gaps"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    plan_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("plans.id"), default=None, nullable=True
    )
    missing_roles: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    missing_skills: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    hiring_needs: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    estimated_cost: Mapped[float | None] = mapped_column(Float, default=None, nullable=True)
    estimated_hiring_timeline: Mapped[str | None] = mapped_column(
        String(255), default=None, nullable=True
    )
    hiring_priority: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    available_resources: Mapped[dict | None] = mapped_column(JSONB, default=None, nullable=True)
    required_resources: Mapped[dict | None] = mapped_column(JSONB, default=None, nullable=True)


class DependencyGraph(Base, BaseEntity):
    __tablename__ = "dependency_graphs"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    nodes: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    edges: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    critical_path: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    circular_dependencies: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    blocked_tasks: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    cascade_effects: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)


class Bottleneck(Base, BaseEntity):
    __tablename__ = "bottlenecks"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    bottleneck_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    root_cause: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    recommended_resolution: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    affected_entity_type: Mapped[str | None] = mapped_column(String(100), default=None, nullable=True)
    affected_entity_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), default=None, nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    detected_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default_factory=_utcnow, nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, default=None, nullable=True
    )


class DecisionMemoryEntry(Base, BaseEntity):
    __tablename__ = "decision_memory"

    objective_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("objectives.id"), nullable=False
    )
    decision_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("decisions.id"), default=None, nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    decision_text: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    evidence: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    alternatives: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)
    approver: Mapped[str | None] = mapped_column(String(255), default=None, nullable=True)
    decision_date: Mapped[datetime | None] = mapped_column(
        UTCDateTime, default=None, nullable=True
    )
    impact: Mapped[str | None] = mapped_column(Text, default=None, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONB, default=None, nullable=True)


Index("ix_business_readiness_objective_id", BusinessReadiness.objective_id, unique=True)
Index("ix_missing_info_objective_id", MissingInfoCheck.objective_id, unique=True)
Index("ix_devils_advocate_objective_id", DevilsAdvocateCritique.objective_id)
Index("ix_success_prob_objective_id", SuccessProbability.objective_id)
Index("ix_resource_gap_objective_id", ResourceGap.objective_id)
Index("ix_dep_graph_objective_id", DependencyGraph.objective_id, unique=True)
Index("ix_bottlenecks_objective_id", Bottleneck.objective_id)
Index("ix_bottlenecks_type", Bottleneck.bottleneck_type)
Index("ix_bottlenecks_severity", Bottleneck.severity)
Index("ix_bottlenecks_status", Bottleneck.status)
Index("ix_decision_memory_objective_id", DecisionMemoryEntry.objective_id)
Index("ix_decision_memory_date", DecisionMemoryEntry.decision_date)
