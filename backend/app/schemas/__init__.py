from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────────────────────────

class ObjectiveStatus(str, Enum):
    DRAFT = "draft"
    COMPILING = "compiling"
    COMPILED = "compiled"
    PLANNING = "planning"
    PLANNED = "planned"
    ORGANIZING = "organizing"
    ORGANIZED = "organized"
    ANALYZING_RISKS = "analyzing_risks"
    RISKS_ANALYZED = "risks_analyzed"
    SIMULATING = "simulating"
    SIMULATED = "simulated"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    EXECUTING = "executing"
    MONITORING = "monitoring"
    ADAPTING = "adapting"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DecisionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    UNDER_REVIEW = "UNDER_REVIEW"


class PlanStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskStatus(str, Enum):
    IDENTIFIED = "identified"
    MITIGATED = "mitigated"
    REALIZED = "realized"
    CLOSED = "closed"


class ScenarioStatus(str, Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class MilestoneStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class KPIStatus(str, Enum):
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    BEHIND = "behind"
    COMPLETED = "completed"


# ─── RBAC ───────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    FOUNDER = "founder"
    ADMIN = "admin"
    MANAGER = "manager"
    REVIEWER = "reviewer"
    VIEWER = "viewer"


class Permission(str, Enum):
    CREATE_OBJECTIVE = "create:objective"
    READ_OBJECTIVE = "read:objective"
    UPDATE_OBJECTIVE = "update:objective"
    DELETE_OBJECTIVE = "delete:objective"
    APPROVE_DECISION = "approve:decision"
    REJECT_DECISION = "reject:decision"
    REVIEW_DECISION = "review:decision"
    MANAGE_USERS = "manage:users"
    VIEW_DASHBOARD = "view:dashboard"
    VIEW_REPORTS = "view:reports"
    RUN_SIMULATION = "run:simulation"
    REPLAN = "replan"
    MANAGE_ORGANIZATION = "manage:organization"


ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.FOUNDER: {
        Permission.CREATE_OBJECTIVE,
        Permission.READ_OBJECTIVE,
        Permission.UPDATE_OBJECTIVE,
        Permission.DELETE_OBJECTIVE,
        Permission.APPROVE_DECISION,
        Permission.REJECT_DECISION,
        Permission.REVIEW_DECISION,
        Permission.MANAGE_USERS,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.RUN_SIMULATION,
        Permission.REPLAN,
        Permission.MANAGE_ORGANIZATION,
    },
    UserRole.ADMIN: {
        Permission.CREATE_OBJECTIVE,
        Permission.READ_OBJECTIVE,
        Permission.UPDATE_OBJECTIVE,
        Permission.DELETE_OBJECTIVE,
        Permission.APPROVE_DECISION,
        Permission.REJECT_DECISION,
        Permission.REVIEW_DECISION,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.RUN_SIMULATION,
        Permission.REPLAN,
        Permission.MANAGE_ORGANIZATION,
    },
    UserRole.MANAGER: {
        Permission.CREATE_OBJECTIVE,
        Permission.READ_OBJECTIVE,
        Permission.UPDATE_OBJECTIVE,
        Permission.REVIEW_DECISION,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
        Permission.RUN_SIMULATION,
        Permission.MANAGE_ORGANIZATION,
    },
    UserRole.REVIEWER: {
        Permission.READ_OBJECTIVE,
        Permission.REVIEW_DECISION,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
    },
    UserRole.VIEWER: {
        Permission.READ_OBJECTIVE,
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_REPORTS,
    },
}


# ─── Meta / Shared ───────────────────────────────────────────────────────────

class MetaData(BaseModel):
    trace_id: str | None = None
    timestamp: str | None = None


class ApiResponse(BaseModel):
    data: Any = None
    meta: MetaData = Field(default_factory=MetaData)


class PaginatedResponse(BaseModel):
    data: list[Any] = []
    meta: MetaData = Field(default_factory=MetaData)
    total: int = 0
    skip: int = 0
    limit: int = 100


# ─── Objective Schemas ───────────────────────────────────────────────────────

class ObjectiveCreate(BaseModel):
    raw_input: str = Field(..., min_length=1, description="Raw business objective text")
    user_id: str | None = None


class ObjectiveUpdate(BaseModel):
    raw_input: str | None = None
    status: ObjectiveStatus | None = None


class ObjectiveCompilationSchema(BaseModel):
    mission: str | None = None
    vision: str | None = None
    business_type: str | None = None
    industry: str | None = None
    stakeholders: list[dict[str, Any]] | None = None
    constraints: list[str] | None = None
    kpis: list[dict[str, Any]] | None = None
    timeline: dict[str, Any] | None = None
    budget: dict[str, Any] | None = None
    dependencies: list[str] | None = None
    assumptions: list[str] | None = None
    risks: list[dict[str, Any]] | None = None
    success_metrics: list[dict[str, Any]] | None = None


class ObjectiveResponse(BaseModel):
    id: str
    raw_input: str
    compiled_summary: str | None = None
    structured_goal: str | None = None
    constraints: dict[str, Any] | None = None
    success_criteria: list[Any] | None = None
    confidence: float | None = None
    status: str
    current_stage: str | None = None
    user_id: str | None = None
    compilation: ObjectiveCompilationSchema | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ObjectiveCompileRequest(BaseModel):
    pass


class ObjectiveCompileResponse(BaseModel):
    objective: ObjectiveResponse
    compilation: ObjectiveCompilationSchema


# ─── Plan Schemas ────────────────────────────────────────────────────────────

class MilestoneSchema(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None
    due_date: datetime | None = None
    status: MilestoneStatus = MilestoneStatus.PENDING
    order: int = 0
    dependencies: list[str] | None = None
    kpis: list[dict[str, Any]] | None = None


class PlanCreate(BaseModel):
    objective_id: str
    name: str = "Execution Plan"
    description: str | None = None


class PlanUpdateParams(BaseModel):
    budget: dict[str, Any] | None = None
    timeline: dict[str, Any] | None = None
    resources: dict[str, Any] | None = None
    business_goal: str | None = None
    constraints: list[str] | None = None


class PlanVersionSchema(BaseModel):
    id: str | None = None
    version_number: int
    changes: dict[str, Any] | None = None
    diff_summary: str | None = None
    snapshot: dict[str, Any] | None = None
    created_at: datetime | None = None


class PlanResponse(BaseModel):
    id: str
    objective_id: str
    name: str
    description: str | None = None
    status: str
    plan_version: int
    roadmap: dict[str, Any] | None = None
    timeline: dict[str, Any] | None = None
    total_cost: float | None = None
    confidence: float | None = None
    milestones: list[MilestoneSchema] | None = None
    versions: list[PlanVersionSchema] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PlanListResponse(BaseModel):
    plans: list[PlanResponse]
    total: int


class ReplanResponse(BaseModel):
    plan: PlanResponse
    changes: dict[str, Any]
    diff_summary: str
    previous_version: int
    new_version: int


# ─── Organization Schemas ────────────────────────────────────────────────────

class RoleSchema(BaseModel):
    id: str | None = None
    title: str
    description: str | None = None
    responsibilities: list[str] | None = None
    required_skills: list[str] | None = None
    hiring_order: int = 0
    reports_to: str | None = None
    status: str = "active"
    head_count: int = 1


class DepartmentSchema(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None
    head_count: int = 0
    budget: float | None = None
    status: str = "active"
    roles: list[RoleSchema] | None = None
    kpis: list[dict[str, Any]] | None = None


class OrganizationResponse(BaseModel):
    objective_id: str
    departments: list[DepartmentSchema]
    total_head_count: int = 0
    total_budget: float | None = None


# ─── Risk Schemas ────────────────────────────────────────────────────────────

class RiskCreate(BaseModel):
    objective_id: str
    title: str
    description: str | None = None
    category: str = "strategic"
    probability: float = 0.5
    impact: float = 0.5
    mitigation: str | None = None
    contingency: str | None = None
    owner: str | None = None


class RiskResponse(BaseModel):
    id: str
    objective_id: str
    plan_id: str | None = None
    title: str
    description: str | None = None
    category: str
    probability: float
    impact: float
    risk_level: str
    risk_score: float
    mitigation: str | None = None
    contingency: str | None = None
    owner: str | None = None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ─── Decision Schemas ────────────────────────────────────────────────────────

class DecisionOptionSchema(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None
    pros: list[str] | None = None
    cons: list[str] | None = None
    risks: list[str] | None = None
    cost: float | None = None
    timeline_impact: str | None = None
    confidence: float | None = None
    is_recommended: bool = False


class DecisionCreate(BaseModel):
    objective_id: str
    title: str
    description: str | None = None
    decision_type: str = "strategic"


class DecisionApproveRequest(BaseModel):
    notes: str | None = None
    user_id: str | None = None


class DecisionRejectRequest(BaseModel):
    notes: str | None = None
    user_id: str | None = None


class DecisionResponse(BaseModel):
    id: str
    objective_id: str
    title: str
    description: str | None = None
    decision_type: str
    recommendation: str | None = None
    reasoning: str | None = None
    evidence: list[Any] | None = None
    confidence: float | None = None
    risk_level: str | None = None
    affected_departments: list[str] | None = None
    status: str
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    options: list[DecisionOptionSchema] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ─── Explanation Schemas ────────────────────────────────────────────────────

class ExplanationResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    recommendation: str | None = None
    reasoning: str | None = None
    evidence: list[Any] | None = None
    assumptions: list[Any] | None = None
    confidence: float | None = None
    risk_level: str | None = None
    affected_departments: list[str] | None = None
    dependencies: list[str] | None = None
    model_used: str | None = None
    created_at: datetime | None = None


# ─── Simulation Schemas ──────────────────────────────────────────────────────

class SimulationRequest(BaseModel):
    objective_id: str
    base_plan_id: str | None = None
    name: str = "What-If Scenario"
    description: str | None = None
    parameters: dict[str, Any] = Field(
        ...,
        description="Parameters to change, e.g. {'budget': 50000, 'timeline_months': 6}",
    )


class SimulationResponse(BaseModel):
    id: str
    objective_id: str
    base_plan_id: str | None = None
    name: str
    description: str | None = None
    parameters: dict[str, Any]
    results: dict[str, Any] | None = None
    comparison: dict[str, Any] | None = None
    status: str
    created_at: datetime | None = None


# ─── Knowledge Graph Schemas ────────────────────────────────────────────────

class GraphEdgeCreate(BaseModel):
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relationship_type: str
    properties: dict[str, Any] | None = None


class GraphEdgeResponse(BaseModel):
    id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relationship_type: str
    properties: dict[str, Any] | None = None
    created_at: datetime | None = None


class GraphNodeResponse(BaseModel):
    type: str
    id: str
    label: str | None = None


class GraphTraverseResponse(BaseModel):
    nodes: list[GraphNodeResponse]
    edges: list[GraphEdgeResponse]


# ─── KPI Schemas ─────────────────────────────────────────────────────────────

class KPIResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    target_value: float
    current_value: float | None = None
    unit: str | None = None
    status: str
    measured_at: datetime | None = None
    entity_type: str | None = None
    entity_id: str | None = None


# ─── Dashboard Schemas ───────────────────────────────────────────────────────

class DashboardObjectiveSummary(BaseModel):
    id: str
    summary: str | None = None
    status: str
    current_stage: str | None = None
    confidence: float | None = None
    progress_percent: float = 0.0


class DashboardDepartmentSummary(BaseModel):
    name: str
    status: str
    role_count: int = 0
    head_count: int = 0


class DashboardOrganizationSummary(BaseModel):
    departments: list[DashboardDepartmentSummary] = []
    total_head_count: int = 0
    health_score: float | None = None


class DashboardPlanSummary(BaseModel):
    id: str | None = None
    name: str | None = None
    status: str | None = None
    plan_version: int = 0
    milestone_count: int = 0
    completed_milestones: int = 0
    progress_percent: float = 0.0


class DashboardRiskSummary(BaseModel):
    total: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    top_risks: list[RiskResponse] = []


class DashboardDecisionSummary(BaseModel):
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    under_review: int = 0
    pending_decisions: list[DecisionResponse] = []


class DashboardJobSummary(BaseModel):
    active: int = 0
    pending: int = 0
    completed: int = 0
    failed: int = 0


class DashboardResponse(BaseModel):
    objective: DashboardObjectiveSummary | None = None
    organization: DashboardOrganizationSummary | None = None
    plan: DashboardPlanSummary | None = None
    risks: DashboardRiskSummary | None = None
    decisions: DashboardDecisionSummary | None = None
    jobs: DashboardJobSummary | None = None
    system_health: dict[str, Any] | None = None


# ─── Job Schemas ─────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: str
    job_type: str
    status: str
    progress: float = 0.0
    started_at: datetime | None = None
    finished_at: datetime | None = None
    worker: str | None = None
    result: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    user_id: str | None = None
    objective_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ─── Health Schemas ──────────────────────────────────────────────────────────

class SystemHealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database: str
    redis: str


class AIHealthResponse(BaseModel):
    modules: list[str] = []
    active_agents: int = 0
    pending_tasks: int = 0


class OrganizationHealthResponse(BaseModel):
    execution_score: float | None = None
    coordination_score: float | None = None
    risk_index: float | None = None
    trust_score: float | None = None
    decision_quality: float | None = None