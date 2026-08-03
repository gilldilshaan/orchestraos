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

// ============================================
// ORGANIZATIONAL MEMORY TYPES
// ============================================

export interface Memory {
  id: string;
  objective_id: string;
  embedding: number[] | null;
  tags: string[] | null;
  confidence: number | null;
  content: MemoryContent | null;
  history: MemoryHistoryEntry[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
}

export interface MemoryContent {
  summary: string;
  decisions: MemoryDecision[];
  lessons_learned: MemoryLesson[];
  risks: MemoryRisk[];
  success_factors: MemorySuccessFactor[];
  strategy: string;
}

export interface MemoryDecision {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  outcome: string;
}

export interface MemoryLesson {
  lesson: string;
  context: string;
  applicability: string;
}

export interface MemoryRisk {
  title: string;
  description: string;
  materialized: boolean;
  mitigation: string;
}

export interface MemorySuccessFactor {
  factor: string;
  evidence: string;
  reproducibility: "high" | "medium" | "low";
}

export interface MemoryHistoryEntry {
  action: string;
  timestamp: string;
  changes: Record<string, unknown>;
  actor: string;
}

export interface MemorySearchRequest {
  embedding: number[];
  objective_id?: string;
  limit?: number;
  threshold?: number;
}

export interface MemorySearchResponse {
  memories: Memory[];
  scores: number[];
}

export interface MemoryContext {
  has_memories: boolean;
  similar_objectives: SimilarObjective[];
  strategies: string[];
  lessons_learned: MemoryLessonWithSource[];
  risks: MemoryRiskWithSource[];
  executive_decisions: MemoryDecisionWithSource[];
  success_factors: MemorySuccessFactorWithSource[];
  memory_sources: MemorySource[];
}

export interface SimilarObjective {
  objective_id: string;
  summary: string;
  similarity_score: number;
  strategy: string;
}

export interface MemoryLessonWithSource extends MemoryLesson {
  source_objective_id: string;
  similarity_score: number;
}

export interface MemoryRiskWithSource extends MemoryRisk {
  source_objective_id: string;
  similarity_score: number;
}

export interface MemoryDecisionWithSource extends MemoryDecision {
  source_objective_id: string;
  similarity_score: number;
}

export interface MemorySuccessFactorWithSource extends MemorySuccessFactor {
  source_objective_id: string;
  similarity_score: number;
}

export interface MemorySource {
  memory_id: string;
  objective_id: string;
  similarity_score: number;
  memory_confidence: number;
  success_confidence: number;
  recency_score: number;
  composite_score: number;
  summary: string;
}

export interface MemoryAnalytics {
  total_memories: number;
  total_strategies: number;
  total_lessons: number;
  total_objectives: number;
  total_decisions: number;
  average_confidence: number;
  average_similarity: number;
  reuse_rate: number;
  planning_improvement: number;
  top_categories: Array<{ category: string; count: number }>;
  top_tags: Array<{ tag: string; count: number }>;
  most_used_strategies: Array<{
    strategy: string;
    count: number;
    avg_confidence: number;
    last_used: string | null;
  }>;
  highest_confidence_objectives: Array<{
    objective_id: string;
    memory_id: string;
    title: string;
    confidence: number;
    created_at: string | null;
  }>;
  most_retrieved_memories: Array<{
    objective_id: string;
    memory_id: string;
    title: string;
    usage_count: number;
    created_at: string | null;
  }>;
  charts: {
    memory_growth: Array<{ date: string; count: number }>;
    category_distribution: Array<{ name: string; value: number }>;
    confidence_trend: Array<{ date: string; confidence: number | null; count: number }>;
    strategy_reuse_trend: Array<{ date: string; reuses: number }>;
    timeline: Array<{ date: string; events: number }>;
  };
}

// ── Knowledge Center: semantic search ────────────────────────────────────────

export interface KnowledgeSearchHit {
  memory: Memory;
  similarity_score: number;
  departments: string[];
  category: string;
}

export interface KnowledgeSearchResponse {
  query: string;
  hits: KnowledgeSearchHit[];
}

// ── Knowledge Center: timeline ───────────────────────────────────────────────

export type TimelineEventType =
  | "created"
  | "retrieved"
  | "reused"
  | "updated"
  | "execution_completed";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string | null;
  title: string;
  memory_id: string | null;
  objective_id: string | null;
  objective_summary: string;
  department: string[];
  category: string;
  status: string;
  confidence: number | null;
  extra: Record<string, unknown>;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  total: number;
  skip: number;
  limit: number;
}

// ── Knowledge Center: graph ──────────────────────────────────────────────────

export type KnowledgeNodeType = "objective" | "strategy" | "lesson";

export interface KnowledgeGraphNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  objective_id?: string;
  memory_id?: string;
  confidence?: number | null;
  count?: number;
}

export type KnowledgeEdgeType = "derived_from" | "reuse" | "similarity";

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: KnowledgeEdgeType;
  label: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

// ── Knowledge Center: global search ──────────────────────────────────────────

export interface GlobalSearchGroups {
  objectives: Array<{
    id: string;
    objective_id: string;
    memory_id: string;
    title: string;
    confidence: number | null;
    created_at: string | null;
  }>;
  strategies: Array<{
    id: string;
    strategy: string;
    objective_id: string;
    memory_id: string;
    objective_summary: string;
  }>;
  lessons: Array<{
    id: string;
    lesson: string;
    context: string;
    objective_id: string;
    memory_id: string;
    objective_summary: string;
  }>;
  risks: Array<{
    id: string;
    title: string;
    description: string;
    mitigation: string;
    materialized: boolean;
    objective_id: string;
    memory_id: string;
    objective_summary: string;
  }>;
  decisions: Array<{
    id: string;
    title: string;
    description: string;
    impact: string;
    objective_id: string | null;
    objective_summary: string;
  }>;
  tags: Array<{
    id: string;
    tag: string;
    memory_id: string;
    objective_id: string;
    objective_summary: string;
  }>;
  memories: Array<{
    id: string;
    memory_id: string;
    objective_id: string;
    title: string;
    confidence: number | null;
    created_at: string | null;
  }>;
}

export interface GlobalSearchResponse {
  query: string;
  groups: GlobalSearchGroups;
  total: number;
}

// ── Executive Board ────────────────────────────────────────────────────────

export type BoardStatus = "running" | "completed" | "failed";

export type BoardMessageKind =
  | "opening_statement"
  | "deliberation"
  | "response"
  | "vote"
  | "consensus"
  | "system";

export interface BoardMessagePayload {
  key_points?: string[];
  concerns?: string[];
  questions?: string[];
  agreements?: string[];
  challenges?: Array<{ target: string; point: string }>;
  questions_asked?: Array<{ target: string; question: string }>;
  conditions?: string[];
  answers?: Array<{ question: string; answer: string }>;
  concessions?: string[];
  remaining_concerns?: string[];
  escalation?: boolean;
  escalate_reason?: string;
  vote?: string;
  reasoning?: string;
  verdict?: string;
  mood?: string;
  rationale?: string;
  adopted_conditions?: string[];
  action_items?: string[];
  minority_reports?: Array<{ who: string; point: string }>;
  overall_confidence?: number;
  roster?: string[];
  error?: string;
  [key: string]: unknown;
}

export interface BoardMessage {
  id: string;
  board_session_id: string;
  sender: string;
  recipient: string | null;
  kind: BoardMessageKind;
  round: number;
  title: string;
  content: string | null;
  stance: string | null;
  confidence: number | null;
  payload: BoardMessagePayload | null;
  created_at: string;
}

export interface BoardSession {
  id: string;
  objective_id: string;
  title: string;
  topic: string;
  status: BoardStatus;
  roster: string[];
  rounds: number;
  brief: Record<string, unknown> | null;
  result: BoardResult | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardRollCallEntry {
  role: string;
  vote: string;
  stance: string;
  confidence: number | null;
  conditions: string[];
  reasoning: string;
}

export interface BoardConflict {
  title: string;
  parties: string[];
  severity: "low" | "medium" | "high";
  status: string;
  details: string;
}

export interface BoardResult {
  verdict: string;
  mood: string;
  decision: string;
  rationale: string;
  action_items: string[];
  adopted_conditions: string[];
  minority_reports: Array<{ who: string; point: string }>;
  overall_confidence: number | null;
  roll_call: BoardRollCallEntry[];
  counts: Record<string, number>;
  conflicts: BoardConflict[];
}

export interface StartBoardRequest {
  objective_id: string;
  title?: string;
  roster?: string[];
  rounds?: number;
}

export interface StartBoardResponse {
  id: string;
  status: BoardStatus;
}

export interface BoardListResponse {
  sessions: BoardSession[];
  total: number;
}

export interface BoardMessagesResponse {
  messages: BoardMessage[];
  total: number;
}

export type BoardEvent =
  | { type: "connected"; phase: string; status: string; message: string; progress: number }
  | { type: "phase"; phase: string; status: string; message: string; progress: number }
  | { type: "message"; message: BoardMessage };

// ── Executive Workspace ────────────────────────────────────────────────────

export type ExecutiveRole =
  | "CEO"
  | "Planner"
  | "Engineering"
  | "Finance"
  | "Marketing"
  | "Legal"
  | "Risk"
  | "Operations";

export type WorkspaceItemKind =
  | "task"
  | "decision"
  | "note"
  | "approval"
  | "risk"
  | "insight";

export type WorkspaceItemStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "blocked"
  | "cancelled";

export interface ExecutiveWorkspace {
  id: string;
  objective_id: string;
  executive_role: ExecutiveRole;
  title: string;
  status: string;
  context: Record<string, unknown> | null;
  kpis: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceItem {
  id: string;
  workspace_id: string;
  kind: WorkspaceItemKind;
  title: string;
  content: string | null;
  priority: string | null;
  status: WorkspaceItemStatus;
  due_at: string | null;
  source: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSummary {
  workspace: {
    id: string;
    title: string;
    role: ExecutiveRole;
    status: string;
  };
  kpis: Record<string, unknown>;
  items: {
    total: number;
    by_kind: Record<string, number>;
    open_by_kind: Record<string, number>;
  };
  memories: { total: number };
  updated_at: string | null;
}

export interface EnsureWorkspaceRequest {
  objective_id: string;
  executive_role: ExecutiveRole;
}

export interface CreateItemRequest {
  kind: WorkspaceItemKind;
  title: string;
  content?: string;
  priority?: string;
  due_at?: string;
  source?: Record<string, unknown>;
}

export interface UpdateItemRequest {
  title?: string;
  content?: string;
  priority?: string;
  status?: WorkspaceItemStatus;
  due_at?: string;
}

export interface UpdateKpisRequest {
  kpis: Record<string, unknown>;
}

export interface WorkspaceItemsResponse {
  items: WorkspaceItem[];
  total: number;
}

export interface MemoryPartitionItem {
  id: string;
  objective_id: string;
  executive_id: string | null;
  embedding: number[] | null;
  tags: string[] | null;
  confidence: number | null;
  content: Record<string, unknown> | null;
  history: Array<Record<string, unknown>> | null;
  created_at: string;
  updated_at: string;
}

export type WorkspaceEvent =
  | { type: "connected"; phase: string; status: string; message: string; progress: number }
  | { type: "phase"; phase: string; status: string; message: string; progress: number }
  | { type: "item"; item: WorkspaceItem };
