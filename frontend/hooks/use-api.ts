import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

// Background poll interval for widgets that should stay live even when no
// New-Run/execution-page invalidation is in flight (e.g. the dashboard
// homepage open in a tab while a run completes elsewhere).
const LIVE_POLL_INTERVAL = 10_000;

// ─── Raw API response types ────────────────────────────

export interface ApiHealthSystem {
  status: string;
  version: string;
  environment: string;
  dependencies: Record<string, { status: string }>;
}

export interface ApiHealthAi {
  status: string;
  modules: string[];
  active_agents: number;
  active_executives: number;
  active_specialists: number;
  provider: string;
  model: string | null;
  active_runs: number;
  queue_depth: number;
  pending_tasks: number;
  uptime_seconds: number;
  kernel: {
    total_calls: number;
    cache_hit_rate: number;
    total_cost: number;
    tokens_used: number;
  };
}

export interface ApiHealthOrganization {
  status: string;
  active_objectives: number;
  active_departments: number;
  active_specialists: number;
  pending_decisions: number;
  completed_objectives: number;
  failed_objectives: number;
}

export interface ApiExecutiveReport {
  summary: string | null;
  reasoning: string | null;
  confidence: number | null;
  risk_level: string | null;
  created_at: string | null;
}

export interface ApiDashboardBusinessReadiness {
  overall_score: number | null;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface ApiDashboardSuccessProbability {
  success_probability: number | null;
  failure_risk: number | null;
}

export interface ApiDashboardBottleneckSeverity {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface ApiDashboardBottlenecks {
  active: number;
  by_severity: ApiDashboardBottleneckSeverity;
  recent: any[];
}

export interface ApiDashboardData {
  objective: ApiDashboardObjective | null;
  organization: ApiDashboardOrganization | null;
  plan: ApiDashboardPlan | null;
  risks: ApiDashboardRisks | null;
  decisions: ApiDashboardDecisions | null;
  jobs: Record<string, number>;
  executive_report: ApiExecutiveReport | null;
  system_health: ApiDashboardSystemHealth | null;
  business_readiness: ApiDashboardBusinessReadiness | null;
  success_probability: ApiDashboardSuccessProbability | null;
  bottlenecks: ApiDashboardBottlenecks | null;
  devils_advocate: any | null;
  decision_memory: any | null;
}

export interface ApiDashboardObjective {
  id: string | null;
  summary: string | null;
  status: string | null;
  current_stage: string | null;
  confidence: number | null;
  created_at: string | null;
  updated_at: string | null;
  progress_percent: number;
}

export interface ApiDashboardOrganization {
  departments: Array<{ name: string; status: string; role_count: number; head_count: number }>;
  total_head_count: number;
  health_score: number | null;
}

export interface ApiDashboardPlan {
  id: string | null;
  name: string | null;
  status: string | null;
  plan_version: number;
  confidence: number | null;
  milestone_count: number;
  completed_milestones: number;
  progress_percent: number;
}

export interface ApiDashboardRiskItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  probability: number;
  impact: number;
  risk_level: string;
  risk_score: number;
  mitigation: string | null;
  contingency: string | null;
  owner: string | null;
  status: string;
}

export interface ApiDashboardRisks {
  total: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
  top_risks: ApiDashboardRiskItem[];
}

export interface ApiDashboardDecisions {
  pending_decisions: Array<{ id: string; title: string; recommendation: string; confidence: number }>;
}

export interface ApiDashboardSystemHealth {
  execution_score: number | null;
  coordination_score: number | null;
  risk_index: number | null;
  trust_score: number | null;
  decision_quality: number | null;
  business_readiness_score: number | null;
  success_probability_score: number | null;
}

export interface ApiDecisionExplanation {
  recommendation: string | null;
  reasoning: string | null;
  evidence: string[] | null;
  assumptions: string[] | null;
  confidence: number | null;
  risk_level: string | null;
  affected_departments: string[] | null;
  model_used: string | null;
  created_at: string | null;
}

export interface ApiDecision {
  id: string;
  objective_id: string;
  title: string;
  decision_type: string;
  recommendation: string;
  reasoning: string;
  evidence?: string[];
  confidence: number;
  risk_level: string;
  status: string;
  options?: Array<{
    id: string;
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    risks: string[];
    cost: number | null;
    confidence: number;
    is_recommended: boolean;
  }>;
  review_notes?: string | null;
  explanation?: ApiDecisionExplanation | null;
  created_at: string | null;
}

export interface ApiOrganization {
  objective_id: string;
  departments: ApiDepartment[];
  total_head_count: number;
}

export interface ApiDepartment {
  id: string;
  name: string;
  description: string | null;
  head_count: number;
  budget: number | null;
  status: string;
  roles: ApiRole[];
}

export interface ApiRole {
  id: string;
  title: string;
  description: string | null;
  responsibilities: string[];
  required_skills: string[];
  hiring_order: number;
  head_count: number;
  status: string;
}

export interface ApiCompilation {
  mission: string | null;
  vision: string | null;
  business_type: string | null;
  industry: string | null;
  stakeholders: Record<string, unknown>[] | null;
  constraints: string[] | null;
  kpis: { name: string; target: string }[] | null;
  timeline: Record<string, unknown> | null;
  budget: Record<string, unknown> | null;
  dependencies: string[] | null;
  assumptions: string[] | null;
  risks: Record<string, unknown>[] | null;
  success_metrics: Record<string, unknown>[] | null;
}

export interface ApiObjective {
  id: string;
  raw_input: string;
  compiled_summary: string | null;
  structured_goal: string | null;
  constraints: Record<string, unknown> | null;
  success_criteria: unknown[] | null;
  confidence: number | null;
  status: string;
  current_stage: string | null;
  user_id: string | null;
  compilation: ApiCompilation | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiPlanVersion {
  id: string;
  version_number: number;
  changes: Record<string, unknown> | null;
  diff_summary: string | null;
  created_at: string | null;
}

export interface ApiPlan {
  id: string;
  objective_id: string;
  name: string;
  description: string | null;
  status: string;
  plan_version: number;
  roadmap: Record<string, unknown> | null;
  timeline: Record<string, unknown> | null;
  total_cost: number | null;
  confidence: number | null;
  milestones: ApiMilestone[];
  versions: ApiPlanVersion[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiMilestone {
  id: string;
  name: string;
  description: string | null;
  status: string;
  order: number;
  due_date: string | null;
}

// ─── Default objective resolution ──────────────────────

export function useLatestObjectiveIdQuery(enabled = true) {
  return useQuery({
    queryKey: ["objectives", "latest"],
    queryFn: async () => {
      const objectives = await apiClient.get<ApiObjective[]>("/objectives?limit=1");
      return objectives.length > 0 ? objectives[0].id : null;
    },
    staleTime: 30_000,
    retry: 1,
    enabled,
  });
}

// ─── Health ─────────────────────────────────────────────

export function useSystemHealthQuery() {
  return useQuery({
    queryKey: ["health", "system"],
    queryFn: () => apiClient.get<ApiHealthSystem>("/health/system"),
    staleTime: 15_000,
    retry: 2,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

export function useHealthAiQuery() {
  return useQuery({
    queryKey: ["health", "ai"],
    queryFn: () => apiClient.get<ApiHealthAi>("/health/ai"),
    staleTime: 10_000,
    retry: 2,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

export function useHealthOrganizationQuery() {
  return useQuery({
    queryKey: ["health", "organization"],
    queryFn: () => apiClient.get<ApiHealthOrganization>("/health/organization"),
    staleTime: 10_000,
    retry: 2,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

// ─── Objectives ─────────────────────────────────────────

export function useObjectivesQuery() {
  return useQuery({
    queryKey: ["objectives"],
    queryFn: () => apiClient.get<ApiObjective[]>("/objectives"),
    staleTime: 30_000,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

export function useObjectiveQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["objectives", objectiveId],
    queryFn: () => apiClient.get<ApiObjective>(`/objectives/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 30_000,
  });
}

// ─── Dashboard ──────────────────────────────────────────

export function useDashboardQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["dashboard", objectiveId],
    queryFn: () => apiClient.get<ApiDashboardData>(`/dashboard/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 15_000,
    retry: 1,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

export function useDashboardsQuery() {
  return useQuery({
    queryKey: ["dashboards"],
    queryFn: () => apiClient.get<ApiDashboardData[]>("/dashboard"),
    staleTime: 30_000,
    retry: 1,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

// ─── Decisions ──────────────────────────────────────────

export function useDecisionsQuery(objectiveId?: string | null) {
  return useQuery({
    queryKey: ["decisions", objectiveId ?? "all"],
    queryFn: () => {
      const params = objectiveId ? `?objective_id=${objectiveId}` : "";
      return apiClient.get<ApiDecision[]>(`/decisions${params}`);
    },
    staleTime: 15_000,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

// ─── Organization ───────────────────────────────────────

export function useOrganizationQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["organizations", objectiveId],
    queryFn: () =>
      apiClient.get<ApiOrganization>(`/organizations/objective/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 30_000,
    retry: 1,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

// ─── Plans ──────────────────────────────────────────────

export function usePlanQuery(planId: string | null | undefined) {
  return useQuery({
    queryKey: ["plans", planId],
    queryFn: () => apiClient.get<ApiPlan>(`/plans/${planId}`),
    enabled: !!planId,
    staleTime: 30_000,
    refetchInterval: LIVE_POLL_INTERVAL,
  });
}

// ─── Runtime Metrics ────────────────────────────────────

export interface ApiAggregateMetrics {
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  success_rate: number | null;
  average_runtime_seconds: number | null;
  average_confidence: number | null;
  average_plan_confidence: number | null;
  average_organization_health: number | null;
  average_executives_spawned: number | null;
  average_specialists_spawned: number | null;
  average_decisions: number | null;
  average_milestones: number | null;
  average_tokens: number | null;
  average_cost: number | null;
  peak_parallelism: number | null;
  average_parallelism: number | null;
  average_retries: number | null;
  average_stage_duration_seconds: number | null;
  average_event_count: number | null;
}

export interface ApiChartData {
  runtime_over_time: Array<{
    date: string;
    average_runtime_seconds: number | null;
    run_count: number;
  }>;
  confidence_trend: Array<{
    date: string;
    average_confidence: number | null;
    run_count: number;
  }>;
  success_rate_trend: Array<{
    date: string;
    success_rate: number | null;
    total_runs: number;
    succeeded: number;
  }>;
}

export function useAggregateMetricsQuery() {
  return useQuery({
    queryKey: ["metrics", "aggregate"],
    queryFn: () => apiClient.get<ApiAggregateMetrics>("/metrics/aggregate"),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useChartDataQuery() {
  return useQuery({
    queryKey: ["metrics", "charts"],
    queryFn: () => apiClient.get<ApiChartData>("/metrics/charts"),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

// ─── Artifacts / Telemetry ───────────────────────────────

export interface ApiStoredEvent {
  id: string;
  objective_id: string;
  stage: string;
  status: string;
  message: string | null;
  progress: number;
  event_order: number;
  created_at: string | null;
}

export interface ApiAgentTelemetry {
  id: string;
  objective_id: string;
  agent_id: string;
  agent_name: string | null;
  stage: string;
  role: string | null;
  department: string | null;
  status: string;
  start_time: string | null;
  finish_time: string | null;
  runtime_ms: number | null;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  input_cost: number | null;
  output_cost: number | null;
  total_cost: number | null;
  retries: number;
  error: string | null;
  tool_calls: Array<Record<string, unknown>> | null;
  reasoning_summary: string | null;
  decision_summary: string | null;
  artifacts_produced: Array<Record<string, unknown>> | null;
  confidence: number | null;
}

export interface ApiTelemetrySummary {
  total_agents: number;
  completed: number;
  failed: number;
  total_cost: number;
  total_tokens: number;
  total_runtime_ms: number;
  by_stage: Record<string, number>;
}

export function useEventsQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["events", objectiveId],
    queryFn: async () => {
      const result = await apiClient.get<{ events: ApiStoredEvent[]; total: number }>(
        `/artifacts/${objectiveId}/events`,
      );
      return result.events;
    },
    enabled: !!objectiveId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useTelemetryQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["telemetry", objectiveId],
    queryFn: async () => {
      const result = await apiClient.get<{ telemetry: ApiAgentTelemetry[]; total: number }>(
        `/artifacts/${objectiveId}/telemetry`,
      );
      return result.telemetry;
    },
    enabled: !!objectiveId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useTelemetrySummaryQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["telemetry", objectiveId, "summary"],
    queryFn: () =>
      apiClient.get<ApiTelemetrySummary>(`/artifacts/${objectiveId}/telemetry/summary`),
    enabled: !!objectiveId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}
