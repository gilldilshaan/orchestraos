import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Github, Layers, MessageSquare, FileText, Mail, Link2, type LucideIcon } from "lucide-react";

export interface ConnectorConfig {
  id: string;
  provider: string;
  name: string;
  auth_type: string;
  status: string;
  health_status: string | null;
  last_health_check: string | null;
  config: Record<string, unknown> | null;
  objective_id: string | null;
  created_at: string | null;
}

export interface ConnectorAction {
  id: string;
  connector_id: string;
  action: string;
  params: Record<string, unknown> | null;
  status: string;
  error: string | null;
  duration_ms: number | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface ConnectorAuditLog {
  id: string;
  connector_id: string;
  action: string;
  actor: string;
  target: string;
  result: string;
  details: Record<string, unknown> | null;
  created_at: string | null;
}

export interface ConnectorWebhook {
  id: string;
  connector_id: string | null;
  url: string;
  method: string;
  events: string[] | null;
  active: boolean;
  last_delivery: string | null;
  last_status: string | null;
}

export interface MarketplaceEntry {
  provider: string;
  actions: Array<{ name: string; description: string; params: Record<string, string> }>;
}

export const PROVIDER_META: Record<string, { color: string; icon: LucideIcon }> = {
  github: { color: "text-white bg-gray-800", icon: Github },
  jira: { color: "text-white bg-blue-600", icon: Layers },
  slack: { color: "text-white bg-emerald-600", icon: MessageSquare },
  notion: { color: "text-white bg-black", icon: FileText },
  google_workspace: { color: "text-white bg-blue-500", icon: Mail },
  webhook: { color: "text-white bg-violet-600", icon: Link2 },
};

export const DEFAULT_PROVIDER_META: { color: string; icon: LucideIcon } = {
  color: "text-white bg-muted",
  icon: Link2,
};

// ─── Connectors CRUD ───────────────────────────────────

export function useConnectorsQuery(objectiveId?: string | null) {
  const params = objectiveId ? `?objective_id=${objectiveId}` : "";
  return useQuery({
    queryKey: ["connectors", objectiveId ?? "all"],
    queryFn: () => apiClient.get<ConnectorConfig[]>(`/connectors${params}`),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useConnectorQuery(connectorId: string | null | undefined) {
  return useQuery({
    queryKey: ["connectors", connectorId],
    queryFn: () => apiClient.get<ConnectorConfig>(`/connectors/${connectorId}`),
    enabled: !!connectorId,
    staleTime: 10_000,
  });
}

export function useCreateConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      provider: string;
      name: string;
      auth_type?: string;
      credentials: Record<string, string>;
      config?: Record<string, unknown>;
      objective_id?: string;
    }) => apiClient.post<ConnectorConfig>("/connectors", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });
}

export function useDeleteConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectorId: string) => apiClient.delete(`/connectors/${connectorId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });
}

// ─── Connection ─────────────────────────────────────────

export function useConnectConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectorId: string) =>
      apiClient.post(`/connectors/${connectorId}/connect`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });
}

export function useDisconnectConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectorId: string) =>
      apiClient.post(`/connectors/${connectorId}/disconnect`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });
}

export function useConnectorHealth(connectorId: string | null | undefined) {
  return useQuery({
    queryKey: ["connectors", connectorId, "health"],
    queryFn: () => apiClient.get(`/connectors/${connectorId}/health`),
    enabled: !!connectorId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

// ─── Actions ────────────────────────────────────────────

export function useExecuteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      connector_id,
      action,
      params,
      objective_id,
    }: {
      connector_id: string;
      action: string;
      params?: Record<string, unknown>;
      objective_id?: string;
    }) =>
      apiClient.post(`/connectors/${connector_id}/execute`, {
        action,
        params: params ?? {},
        objective_id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connectors"] });
    },
  });
}

export function useConnectorActionsQuery(connectorId: string | null | undefined) {
  return useQuery({
    queryKey: ["connectors", connectorId, "actions"],
    queryFn: () => apiClient.get<ConnectorAction[]>(`/connectors/${connectorId}/actions`),
    enabled: !!connectorId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

// ─── Audit ──────────────────────────────────────────────

export function useAuditLogsQuery(connectorId: string | null | undefined) {
  return useQuery({
    queryKey: ["connectors", connectorId, "audit"],
    queryFn: () =>
      apiClient.get<ConnectorAuditLog[]>(`/connectors/${connectorId}/audit`),
    enabled: !!connectorId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

// ─── Webhooks ───────────────────────────────────────────

export function useWebhooksQuery() {
  return useQuery({
    queryKey: ["connectors", "webhooks"],
    queryFn: () => apiClient.get<ConnectorWebhook[]>("/connectors/webhooks"),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useRegisterWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      connector_id?: string;
      url: string;
      method?: string;
      events?: string[];
      headers?: Record<string, string>;
      secret?: string;
      max_retries?: number;
    }) => apiClient.post("/connectors/webhooks", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors", "webhooks"] }),
  });
}

// ─── Marketplace ────────────────────────────────────────

export function useMarketplaceQuery() {
  return useQuery({
    queryKey: ["connectors", "marketplace"],
    queryFn: () => apiClient.get<MarketplaceEntry[]>("/connectors/marketplace/available"),
    staleTime: 60_000,
  });
}
