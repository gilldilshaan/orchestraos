from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ─── Feature 1: Business Readiness Assessment ─────────────────────────────

class BusinessReadinessRequest(BaseModel):
    objective_id: str


class BusinessReadinessResponse(BaseModel):
    id: str
    objective_id: str
    overall_score: float
    market_readiness: float | None = None
    technical_feasibility: float | None = None
    budget_readiness: float | None = None
    team_readiness: float | None = None
    timeline_feasibility: float | None = None
    strengths: list[str] | None = None
    weaknesses: list[str] | None = None
    recommendations: list[str] | None = None
    category_scores: dict[str, Any] | None = None
    created_at: datetime | None = None


# ─── Feature 2: Missing Information Detector ──────────────────────────────

class MissingInfoCheckResponse(BaseModel):
    id: str
    objective_id: str
    missing_fields: list[str]
    critical_missing: list[str]
    clarification_questions: list[str]
    is_complete: bool
    refinement_round: int
    previous_responses: dict[str, Any] | None = None


class MissingInfoRefineRequest(BaseModel):
    answers: dict[str, Any] = Field(..., description="Answers to clarification questions")


# ─── Feature 3: AI Devil's Advocate Agent ─────────────────────────────────

class DevilsAdvocateRequest(BaseModel):
    objective_id: str
    plan_id: str | None = None


class DevilsAdvocateResponse(BaseModel):
    id: str
    objective_id: str
    plan_id: str | None = None
    critique_score: float
    counter_arguments: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    assumptions: list[dict[str, Any]]
    better_alternatives: list[dict[str, Any]]
    recommendations: list[str] | None = None
    created_at: datetime | None = None


# ─── Feature 4: Success Probability Engine ────────────────────────────────

class SuccessProbabilityResponse(BaseModel):
    id: str
    objective_id: str
    plan_id: str | None = None
    success_probability: float
    failure_risk: float
    delay_risk: float
    budget_overrun_risk: float
    team_risk: float
    confidence_score: float
    reasoning: str | None = None
    risk_factors: list[dict[str, Any]] | None = None
    mitigating_factors: list[dict[str, Any]] | None = None
    created_at: datetime | None = None


# ─── Feature 5: Resource Gap Analysis ─────────────────────────────────────

class ResourceGapResponse(BaseModel):
    id: str
    objective_id: str
    plan_id: str | None = None
    missing_roles: list[dict[str, Any]]
    missing_skills: list[str]
    hiring_needs: list[dict[str, Any]]
    estimated_cost: float | None = None
    estimated_hiring_timeline: str | None = None
    hiring_priority: list[dict[str, Any]] | None = None
    available_resources: dict[str, Any] | None = None
    required_resources: dict[str, Any] | None = None
    created_at: datetime | None = None


# ─── Feature 6: Smart Dependency Engine ───────────────────────────────────

class DependencyGraphResponse(BaseModel):
    id: str
    objective_id: str
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    critical_path: list[dict[str, Any]]
    circular_dependencies: list[dict[str, Any]]
    blocked_tasks: list[dict[str, Any]]
    cascade_effects: list[dict[str, Any]] | None = None
    created_at: datetime | None = None


# ─── Feature 7: Bottleneck Detection ─────────────────────────────────────

class BottleneckResponse(BaseModel):
    id: str
    objective_id: str
    bottleneck_type: str
    severity: str
    title: str
    description: str | None = None
    root_cause: str | None = None
    recommended_resolution: str | None = None
    affected_entity_type: str | None = None
    affected_entity_id: str | None = None
    status: str
    detected_at: datetime | None = None
    resolved_at: datetime | None = None


class BottleneckScanResponse(BaseModel):
    bottlenecks: list[BottleneckResponse]
    total: int
    critical_count: int
    high_count: int


# ─── Feature 8: Executive Dashboard ───────────────────────────────────────

class ExecutiveDashboardResponse(BaseModel):
    objective_id: str
    business_readiness: BusinessReadinessResponse | None = None
    success_probability: SuccessProbabilityResponse | None = None
    resource_gaps: ResourceGapResponse | None = None
    dependency_graph: DependencyGraphResponse | None = None
    bottlenecks: BottleneckScanResponse | None = None
    devil_advocate: DevilsAdvocateResponse | None = None
    overall_health: dict[str, Any] | None = None


# ─── Feature 9: Decision Memory ──────────────────────────────────────────

class DecisionMemoryEntryCreate(BaseModel):
    objective_id: str
    decision_id: str | None = None
    title: str
    decision_text: str | None = None
    reason: str | None = None
    evidence: list[str] | None = None
    alternatives: list[str] | None = None
    approver: str | None = None
    decision_date: datetime | None = None
    impact: str | None = None
    tags: list[str] | None = None


class DecisionMemoryEntryResponse(BaseModel):
    id: str
    objective_id: str
    decision_id: str | None = None
    title: str
    decision_text: str | None = None
    reason: str | None = None
    evidence: list[Any] | None = None
    alternatives: list[Any] | None = None
    approver: str | None = None
    decision_date: datetime | None = None
    impact: str | None = None
    tags: list[str] | None = None
    created_at: datetime | None = None


# ─── Feature 10: Adaptive Replanning (enhanced) ──────────────────────────

class AdaptiveReplanRequest(BaseModel):
    budget: dict[str, Any] | None = None
    timeline: dict[str, Any] | None = None
    business_goal: str | None = None
    resources: dict[str, Any] | None = None
    constraints: list[str] | None = None


# ─── Feature 11: Scenario Simulator (enhanced) ───────────────────────────

class ScenarioSimulateRequest(BaseModel):
    objective_id: str
    base_plan_id: str | None = None
    name: str = "What-If Scenario"
    description: str | None = None
    parameters: dict[str, Any] = Field(
        ...,
        description="Scenario parameters e.g. {'budget_decrease': 0.2, 'timeline_months': 6}",
    )


# ─── Feature 12: Explainable AI ──────────────────────────────────────────

class ExplainableAIResponse(BaseModel):
    recommendation: str | None = None
    reasoning: str | None = None
    evidence: list[Any] | None = None
    assumptions: list[Any] | None = None
    confidence: float | None = None
    trade_offs: list[str] | None = None
    risks: list[dict[str, Any]] | None = None
    dependencies: list[str] | None = None
    affected_modules: list[str] | None = None
