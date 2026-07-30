"use client";

import type {
  DashboardSummary,
  RunSummary,
  SystemHealth,
  DecisionData,
} from "@/types";
import {
  useLatestObjectiveIdQuery,
  useSystemHealthQuery,
  useHealthAiQuery,
  useHealthOrganizationQuery,
  useDashboardQuery,
  useDashboardsQuery,
  useDecisionsQuery,
  useAggregateMetricsQuery,
  type ApiDashboardData,
  type ApiDecision,
  type ApiHealthAi,
  type ApiAggregateMetrics,
} from "./use-api";

function runtimeSeconds(createdAt: string | null, updatedAt: string | null, isTerminal: boolean): number {
  if (!createdAt) return 0;
  const start = new Date(createdAt).getTime();
  const end = isTerminal && updatedAt ? new Date(updatedAt).getTime() : Date.now();
  return Math.max(0, (end - start) / 1000);
}

function adaptHealth(systemHealth: { status: string } | undefined, ai: ApiHealthAi | undefined): SystemHealth {
  return {
    status: systemHealth?.status === "healthy" ? "healthy" : systemHealth?.status === "degraded" ? "degraded" : "degraded",
    uptime: ai?.uptime_seconds ?? 0,
    active_runs: ai?.active_runs ?? 0,
    queue_depth: ai?.queue_depth ?? 0,
  };
}

const TERMINAL_STATES = new Set(["completed", "failed", "cancelled"]);
const isTerminalStatus = (s: string | null | undefined): boolean => s ? TERMINAL_STATES.has(s) : false;

function adaptDashboard(api: ApiDashboardData | undefined): DashboardSummary | null {
  if (!api?.objective) return null;
  const sh = api.system_health;
  const isTerminal = isTerminalStatus(api.objective.status);
  const deptCount = api.organization?.departments?.length ?? 0;
  const headCount = api.organization?.total_head_count ?? 0;
  return {
    average_confidence: api.objective.confidence ?? 0,
    total_runtime: runtimeSeconds(api.objective.created_at, api.objective.updated_at, isTerminal),
    success_rate: api.objective.status === "completed" ? 1 : 0,
    executives_spawned: deptCount,
    specialists_spawned: headCount - deptCount,
    health_score: sh?.trust_score ?? sh?.execution_score ?? 0,
    average_retries: 0,
    average_execution_time: runtimeSeconds(api.objective.created_at, api.objective.updated_at, isTerminal),
    recent_runs: [],
    system_health: {
      status: sh?.execution_score != null && sh.execution_score > 0.5 ? "healthy" : "degraded",
      uptime: 0,
      active_runs: 0,
      queue_depth: 0,
    },
  };
}

function adaptRuns(dashboards: ApiDashboardData[] | undefined): RunSummary[] {
  if (!dashboards?.length) return [];
  return dashboards.map((d, i) => {
    const isTerminal = isTerminalStatus(d.objective?.status);
    return {
      id: d.objective?.id ?? `obj_${i}`,
      objective: d.objective?.summary ?? "Unknown Objective",
      status:
        d.objective?.status === "completed"
          ? "completed"
          : d.objective?.status === "failed"
            ? "failed"
            : d.objective?.status === "draft"
              ? "idle"
              : ("running" as const),
      confidence: d.objective?.confidence ?? 0,
      duration: runtimeSeconds(d.objective?.created_at ?? null, d.objective?.updated_at ?? null, isTerminal),
      started_at: d.objective?.created_at ?? new Date().toISOString(),
      node_count: d.organization?.total_head_count ?? 0,
    };
  });
}

function adaptDecisions(decisions: ApiDecision[] | undefined): DecisionData[] {
  if (!decisions?.length) return [];
  return decisions.map((d) => ({
    id: d.id,
    title: d.title ?? "Decision",
    executive_summary: d.reasoning ?? "",
    confidence: d.confidence ?? 0,
    risk_level: (d.risk_level ?? "medium") as DecisionData["risk_level"],
    risks: [],
    tradeoffs:
      d.options?.map((o) => ({
        option: o.name,
        pros: o.pros ?? [],
        cons: o.cons ?? [],
      })) ?? [],
    alternative_options: [],
    recommendation: d.recommendation ?? "",
    reasoning: d.reasoning ?? "",
    evidence: d.evidence ?? [],
    assumptions: [],
  }));
}

export function useDashboard() {
  const { data: objectiveId } = useLatestObjectiveIdQuery();
  const { data, isLoading, error } = useDashboardQuery(objectiveId);
  return {
    data: data ? adaptDashboard(data) : null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}

export function useRecentRuns() {
  const { data } = useDashboardsQuery();
  return { runs: data ? adaptRuns(data) : [] };
}

export function useSystemHealth() {
  const { data: system } = useSystemHealthQuery();
  const { data: ai } = useHealthAiQuery();
  return { health: adaptHealth(system, ai) };
}

export function useDecisions() {
  const { data: objectiveId } = useLatestObjectiveIdQuery();
  const { data } = useDecisionsQuery(objectiveId);
  return { decisions: data ? adaptDecisions(data) : [] };
}

// Pass `objectiveId` to pin metrics to a specific run (e.g. the execution
// page's URL id) instead of whatever objective is currently "latest" — the
// "latest" objective changes as soon as any new run is created, which would
// otherwise silently swap a populated, completed run's metrics for an
// unrelated, newly-created (empty) one.
//
// This hook reports PER-RUN metrics only. For system-wide aggregates across
// every run (the dashboard homepage's "Runtime Metrics" grid), use
// `useAggregateMetrics()` instead — conflating the two was the original bug:
// a single hook fed both a per-run widget and an all-time-aggregate widget
// from the same single-objective query.
export function useMetrics(objectiveId?: string | null) {
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(objectiveId === undefined);
  const resolvedObjectiveId = objectiveId !== undefined ? objectiveId : latestObjectiveId;
  const { data } = useDashboardQuery(resolvedObjectiveId);
  const sh = data?.system_health;
  const isTerminal = isTerminalStatus(data?.objective?.status);
  const deptCount = data?.organization?.departments?.length ?? 0;
  const headCount = data?.organization?.total_head_count ?? 0;
  return {
    metrics: {
      executivesSpawned: deptCount,
      specialistsSpawned: headCount - deptCount,
      avgConfidence: data?.objective?.confidence ?? null,
      healthScore: sh?.trust_score ?? sh?.execution_score ?? null,
      avgRuntime: runtimeSeconds(
        data?.objective?.created_at ?? null,
        data?.objective?.updated_at ?? null,
        !!isTerminal,
      ),
      parallelism: null,
      avgRetries: null,
    },
  };
}

// System-wide aggregates across every run — sourced from the backend
// /metrics/aggregate endpoint which computes from persisted database rows.
// Falls back to client-side aggregation only when the backend is unreachable.
export function useAggregateMetrics() {
  const { data: agg } = useAggregateMetricsQuery();
  const { data: org } = useHealthOrganizationQuery();
  const { data: dashboards } = useDashboardsQuery();

  // Prefer backend-computed metrics
  if (agg) {
    return {
      metrics: {
        totalRuns: agg.total_runs,
        successRate: agg.success_rate ?? 0,
        avgRuntime: agg.average_runtime_seconds ?? null,
        executivesSpawned: agg.average_executives_spawned ?? null,
        specialistsSpawned: agg.average_specialists_spawned ?? null,
        avgConfidence: agg.average_confidence ?? agg.average_plan_confidence ?? null,
        healthScore: null,  // not persisted per-objective
        parallelism: null,
        avgRetries: null,
      },
    };
  }

  // Fallback: client-side aggregation from dashboard data
  const list = dashboards ?? [];
  const withConfidence = list.filter((d) => d.objective?.confidence != null);
  const terminal = list.filter(
    (d) => isTerminalStatus(d.objective?.status),
  );

  const avg = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  const totalRuns = org
    ? org.completed_objectives + org.failed_objectives + org.active_objectives
    : list.length;
  const successRate =
    org && org.completed_objectives + org.failed_objectives > 0
      ? org.completed_objectives / (org.completed_objectives + org.failed_objectives)
      : 0;

  return {
    metrics: {
      totalRuns,
      successRate,
      avgRuntime: avg(
        terminal.map((d) =>
          runtimeSeconds(d.objective?.created_at ?? null, d.objective?.updated_at ?? null, true),
        ),
      ),
      executivesSpawned: null,
      specialistsSpawned: null,
      avgConfidence: avg(withConfidence.map((d) => d.objective?.confidence ?? 0)),
      healthScore: null,
      parallelism: null,
      avgRetries: null,
    },
  };
}
