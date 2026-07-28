// ─── API envelope (backend contract, per CLAUDE.md ApiResponse/ApiError) ───

export interface ApiResponse<T> {
  data: T;
  meta: {
    trace_id: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: unknown[];
    trace_id: string;
  };
}

export interface Pagination {
  next_cursor: string;
  has_more: boolean;
  limit: number;
}

// ─── Shared enums ───

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type DecisionStatus = "pending" | "approved" | "rejected";

// ─── Objective + pipeline (spec §5 anchor types) ───

export interface Objective {
  id: string;
  title: string;
  description: string;
  status: "draft" | "compiling" | "active" | "at_risk" | "completed";
  successProbability: number; // 0-100
  businessReadiness: number; // 0-100
  createdAt: string;
  ownerName: string;
  pipelineRunId?: string;
}

export type PipelineStageName =
  | "compiler"
  | "business_readiness"
  | "planner"
  | "organization"
  | "risk"
  | "decision"
  | "devils_advocate"
  | "resource_gap"
  | "dependency_analysis"
  | "bottleneck_detection"
  | "executive_dashboard"
  | "scenario_simulation"
  | "explainable_ai";

export interface PipelineStage {
  id: string;
  name: PipelineStageName;
  order: number;
  status: "queued" | "running" | "complete" | "failed";
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  confidence?: number;
  explanation?: ExplainabilityMeta;
}

export interface PipelineRun {
  id: string;
  objectiveId: string;
  stages: PipelineStage[];
  startedAt: string;
  completedAt?: string;
}

// ─── Explainability (CLAUDE.md AI recommendation metadata) ───

export interface ExplainabilityMeta {
  recommendation: string;
  reasoning: string;
  evidence: string[];
  assumptions: string[];
  confidence: number; // 0-1
  riskLevel: RiskLevel;
  affectedDepartments: string[];
  dependencies: string[];
  modelUsed: string;
}

// ─── Organization ───

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  headName: string;
  headTitle: string;
  agentCount: number;
  headcount: number;
  healthScore: number; // 0-100
  budget: number;
  status: "healthy" | "at_risk" | "blocked";
}

export interface Role {
  id: string;
  departmentId: string;
  title: string;
  level: number;
  filled: boolean;
  assignedAgentName?: string;
}

// ─── Plans ───

export type MilestoneStatus = "not_started" | "in_progress" | "at_risk" | "done";

export interface Milestone {
  id: string;
  planId: string;
  title: string;
  ownerDepartmentId: string;
  dueDate: string;
  status: MilestoneStatus;
  progress: number; // 0-100
  dependsOn: string[];
}

export interface Plan {
  id: string;
  objectiveId: string;
  status: "draft" | "approved" | "executing" | "completed";
  milestones: Milestone[];
}

// ─── Risk ───

export interface Risk {
  id: string;
  objectiveId: string;
  title: string;
  description: string;
  category: string;
  severity: RiskLevel;
  probability: number; // 0-100
  impact: number; // 0-100
  mitigation: string;
  ownerDepartmentId: string;
  status: "open" | "mitigating" | "resolved";
}

// ─── Decisions ───

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

export interface Decision {
  id: string;
  objectiveId: string;
  title: string;
  description: string;
  status: DecisionStatus;
  confidence: number; // 0-1
  riskLevel: RiskLevel;
  reasoning: string;
  evidence: string[];
  assumptions: string[];
  affectedDepartments: string[];
  options: DecisionOption[];
  createdAt: string;
  resolvedAt?: string;
}

// ─── Scenario simulator ───

export interface ScenarioLevers {
  budgetMultiplier: number; // 1.0 = baseline
  additionalHires: number;
  timelineWeeksDelta: number; // negative = compressed
  scopeReductionPercent: number; // 0-100
}

export interface ScenarioProjection {
  successProbability: number;
  costEstimate: number;
  timelineWeeks: number;
  riskScore: number; // 0-100
}

export interface Scenario {
  id: string;
  objectiveId: string;
  name: string;
  levers: ScenarioLevers;
  baseline: ScenarioProjection;
  projected: ScenarioProjection;
}

// ─── Dashboard ───

export interface DashboardActivity {
  type: string;
  description: string;
  timestamp: string;
}

export interface DashboardData {
  objective: {
    id: string;
    summary: string;
    status: string;
    progress_percent: number;
    current_step: string;
  };
  organization: {
    departments: Array<{
      name: string;
      status: string;
      agent_count: number;
      health_score: number;
    }>;
    health: Record<string, number>;
  };
  plan: Record<string, unknown>;
  pending_decisions: number;
  recent_activity: DashboardActivity[];
}
