import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AgentMessage {
  id: string;
  objective_id: string;
  from_agent: string;
  to_agent: string;
  subject: string;
  body: string | null;
  message_type: string;
  parent_message_id: string | null;
  status: string;
  read_at: string | null;
  created_at: string | null;
}

export interface AgentConflict {
  id: string;
  objective_id: string;
  agent_a: string;
  agent_b: string;
  subject: string;
  disagreement: string;
  status: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

export interface ApprovalGate {
  id: string;
  objective_id: string;
  gate_type: string;
  title: string;
  description: string | null;
  proposed_by: string;
  status: string;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  execution_paused: boolean;
  created_at: string | null;
}

export interface ExecutionCheckpoint {
  id: string;
  objective_id: string;
  completed_steps: string[];
  current_step: string | null;
  status: string;
  cursor: string | null;
  checkpoint_data: Record<string, unknown> | null;
  resume_count: number;
  failure_count: number;
  last_resumed_at: string | null;
}

export interface WatchdogAlert {
  id: string;
  objective_id: string;
  alert_type: string;
  severity: string;
  source: string;
  message: string;
  details: Record<string, unknown> | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string | null;
}

export interface SelfHealingAction {
  id: string;
  objective_id: string;
  trigger_event: string;
  action_type: string;
  target: string;
  result: string;
  details: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string | null;
}

export interface HealingStats {
  total_actions: number;
  success_count: number;
  failure_count: number;
  partial_count: number;
  success_rate: number;
  unresolved_alerts: number;
}

export interface OperationsSummary {
  active_objectives: number;
  running_agents: number;
  queue_depth: number;
  blocked_work_items: number;
  pending_approvals: number;
  health_score: number;
  cost_today: number;
  token_usage: number;
  success_rate: number;
  active_risks: number;
  total_alerts: number;
  pending_gates: number;
  total_checkpoints: number;
  total_healing_actions: number;
}

// ─── Messages ─────────────────────────────────────────

export function useMessagesQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "messages", objectiveId],
    queryFn: () => apiClient.get<AgentMessage[]>(`/intelligence/messages/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (msg: {
      objective_id: string;
      from_agent: string;
      to_agent: string;
      subject: string;
      message_type?: string;
      body?: string;
      parent_message_id?: string;
    }) => apiClient.post("/intelligence/messages", msg),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["intelligence", "messages", vars.objective_id] });
    },
  });
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message_id: string) =>
      apiClient.post(`/intelligence/messages/${message_id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "messages"] });
    },
  });
}

export function useUnreadCountQuery(objectiveId: string | null | undefined, agent: string) {
  return useQuery({
    queryKey: ["intelligence", "unread", objectiveId, agent],
    queryFn: () =>
      apiClient.get<{ unread_count: number }>(
        `/intelligence/messages/${objectiveId}/unread/${agent}`,
      ),
    enabled: !!objectiveId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

// ─── Conflicts ────────────────────────────────────────

export function useConflictsQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "conflicts", objectiveId],
    queryFn: () =>
      apiClient.get<AgentConflict[]>(`/intelligence/conflicts/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useResolveConflict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conflict_id,
      resolution,
      resolved_by,
    }: {
      conflict_id: string;
      resolution: string;
      resolved_by: string;
    }) => apiClient.post(`/intelligence/conflicts/${conflict_id}/resolve`, { resolution, resolved_by }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "conflicts"] });
    },
  });
}

// ─── Approval Gates ───────────────────────────────────

export function useGatesQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "gates", objectiveId],
    queryFn: () =>
      apiClient.get<ApprovalGate[]>(`/intelligence/gates/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function usePendingGatesQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "gates", objectiveId, "pending"],
    queryFn: () =>
      apiClient.get<ApprovalGate[]>(`/intelligence/gates/${objectiveId}/pending`),
    enabled: !!objectiveId,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
}

export function useReviewGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      gate_id,
      status,
      reviewed_by,
      notes,
    }: {
      gate_id: string;
      status: string;
      reviewed_by?: string;
      notes?: string;
    }) =>
      apiClient.post(`/intelligence/gates/${gate_id}/review`, {
        status,
        reviewed_by: reviewed_by ?? "human_reviewer",
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "gates"] });
    },
  });
}

// ─── Checkpoints ──────────────────────────────────────

export function useCheckpointQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "checkpoint", objectiveId],
    queryFn: () =>
      apiClient.get<ExecutionCheckpoint | { error: string }>(
        `/intelligence/checkpoints/${objectiveId}`,
      ),
    enabled: !!objectiveId,
    staleTime: 30_000,
  });
}

export function useResumeCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (objective_id: string) =>
      apiClient.post(`/intelligence/checkpoints/${objective_id}/resume`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "checkpoint"] });
    },
  });
}

// ─── Watchdog Alerts ──────────────────────────────────

export function useAlertsQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "alerts", objectiveId],
    queryFn: () =>
      apiClient.get<WatchdogAlert[]>(`/intelligence/alerts/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useUnresolvedAlertsQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "alerts", objectiveId, "unresolved"],
    queryFn: () =>
      apiClient.get<WatchdogAlert[]>(`/intelligence/alerts/${objectiveId}/unresolved`),
    enabled: !!objectiveId,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alert_id: string) =>
      apiClient.post(`/intelligence/alerts/${alert_id}/acknowledge`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "alerts"] });
    },
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alert_id: string) =>
      apiClient.post(`/intelligence/alerts/${alert_id}/resolve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intelligence", "alerts"] });
    },
  });
}

// ─── Self-Healing ─────────────────────────────────────

export function useHealingActionsQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "healing", objectiveId],
    queryFn: () =>
      apiClient.get<SelfHealingAction[]>(`/intelligence/healing/actions/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useHealingStatsQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["intelligence", "healing", objectiveId, "stats"],
    queryFn: () =>
      apiClient.get<HealingStats>(`/intelligence/healing/stats/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

// ─── Operations Summary ───────────────────────────────

export function useOperationsSummaryQuery() {
  return useQuery({
    queryKey: ["intelligence", "operations", "summary"],
    queryFn: () =>
      apiClient.get<OperationsSummary>("/intelligence/operations/summary"),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}
