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

export interface Objective {
  id: string;
  raw_input: string;
  status: ObjectiveStatus;
  summary: string;
  constraints: Record<string, unknown>;
  success_criteria: string[];
  confidence: number;
  created_at: string;
}

export type ObjectiveStatus =
  | "draft"
  | "compiling"
  | "compiled"
  | "planning"
  | "planned"
  | "organizing"
  | "organized"
  | "executing"
  | "completed"
  | "failed";

export type ExecutionStatus = "idle" | "running" | "completed" | "failed" | "paused";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ExecutiveReport {
  summary: string;
  reasoning: string;
  confidence: number | null;
  risk_level: "low" | "medium" | "high" | "critical";
  created_at: string | null;
}

export interface DashboardSummary {
  average_confidence: number;
  total_runtime: number;
  success_rate: number;
  executives_spawned: number;
  specialists_spawned: number;
  health_score: number;
  average_retries: number;
  average_execution_time: number;
  recent_runs: RunSummary[];
  system_health: SystemHealth;
}

export interface RunSummary {
  id: string;
  objective: string;
  status: ExecutionStatus;
  confidence: number;
  duration: number;
  started_at: string;
  node_count: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  active_runs: number;
  queue_depth: number;
}

export interface ExecutionEvent {
  id: string;
  type: EventType;
  timestamp: string;
  source: string;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export type EventType =
  | "organization_created"
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "node_created"
  | "node_executing"
  | "node_completed"
  | "node_failed"
  | "node_retry"
  | "executive_report"
  | "specialist_report"
  | "supervisor_analysis"
  | "decision_created"
  | "run_started"
  | "run_completed"
  | "run_failed";

export interface OrganizationNode {
  id: string;
  type: "ceo" | "executive" | "specialist";
  title: string;
  status: ExecutionStatus;
  confidence: number;
  runtime: number;
  capabilities: string[];
  metadata?: Record<string, unknown>;
}

export interface OrganizationGraph {
  ceo: OrganizationNode;
  executives: OrganizationNode[];
  specialists: OrganizationNode[];
  connections: Array<{
    source: string;
    target: string;
    type: "manages" | "reports_to" | "collaborates";
  }>;
}

export interface BenchmarkResult {
  baseline_name: string;
  dataset_name: string;
  iteration: number;
  timestamp: string;
  planning_latency: number;
  execution_latency: number;
  total_runtime: number;
  parallel_speedup: number;
  peak_concurrency: number;
  avg_concurrency: number;
  node_count: number;
  executive_count: number;
  specialist_count: number;
  retry_count: number;
  failure_recovery: boolean;
  conflict_count: number;
  decision_confidence: number;
  health_score: number;
  avg_token_usage: number;
  task_success_rate: number;
}

export interface DecisionData {
  id: string;
  title: string;
  executive_summary: string;
  confidence: number;
  risk_level: RiskLevel;
  risks: string[];
  tradeoffs: Array<{
    option: string;
    pros: string[];
    cons: string[];
  }>;
  alternative_options: string[];
  recommendation: string;
  reasoning: string;
  evidence: string[];
  assumptions: string[];
}

export interface ReportData {
  id: string;
  type: "executive" | "organization" | "supervisor" | "decision" | "tradeoff";
  title: string;
  summary: string;
  content: string;
  confidence: number;
  risk_level: RiskLevel;
  created_at: string;
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  content: string;
  type: "text" | "list" | "table" | "code" | "metrics";
  data?: unknown;
}

export interface TelemetryMetric {
  timestamp: string;
  name: string;
  value: number;
  unit: string;
  labels?: Record<string, string>;
}

export interface TelemetrySpan {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: "ok" | "error";
  parent_id?: string;
  attributes?: Record<string, string>;
}

export interface SettingsData {
  theme: "dark" | "light" | "system";
  provider: string;
  model: string;
  max_concurrency: number;
  retry_policy: {
    max_retries: number;
    backoff: "linear" | "exponential";
  };
  telemetry_enabled: boolean;
  prompt_templates: boolean;
}
