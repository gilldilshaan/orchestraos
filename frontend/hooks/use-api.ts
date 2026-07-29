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

export interface ApiDashboardData {
  objective: ApiDashboardObjective | null;
  organization: ApiDashboardOrganization | null;
  plan: ApiDashboardPlan | null;
  risks: ApiDashboardRisks | null;
  decisions: ApiDashboardDecisions | null;
  jobs: Record<string, number>;
  system_health: ApiDashboardSystemHealth | null;
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
  milestone_count: number;
  completed_milestones: number;
  progress_percent: number;
}

export interface ApiDashboardRisks {
  total: number;
  top_risks: Array<{ id: string; title: string; risk_level: string; probability: number; impact: string }>;
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
