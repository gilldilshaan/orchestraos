import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ApiAgentTelemetry, ApiStoredEvent } from "./use-api";

export interface ApiSnapshot {
  id: string;
  objective_id: string;
  snapshot_data: Record<string, unknown>;
  snapshot_version: number;
  created_at: string | null;
  updated_at: string | null;
}

export function useSnapshotQuery(objectiveId: string | null | undefined) {
  return useQuery({
    queryKey: ["snapshot", objectiveId],
    queryFn: () =>
      apiClient.get<ApiSnapshot>(`/artifacts/${objectiveId}/snapshot`),
    enabled: !!objectiveId,
    staleTime: 30_000,
  });
}

export function useArtifactsQuery(objectiveId: string | null | undefined) {
  const eventsQuery = useQuery({
    queryKey: ["events", objectiveId],
    queryFn: () =>
      apiClient.get<{ events: ApiStoredEvent[]; total: number }>(
        `/artifacts/${objectiveId}/events`,
      ),
    enabled: !!objectiveId,
    staleTime: 10_000,
  });

  const telemetryQuery = useQuery({
    queryKey: ["telemetry", objectiveId],
    queryFn: () =>
      apiClient.get<{ telemetry: ApiAgentTelemetry[]; total: number }>(
        `/artifacts/${objectiveId}/telemetry`,
      ),
    enabled: !!objectiveId,
    staleTime: 15_000,
  });

  const snapshotQuery = useQuery({
    queryKey: ["snapshot", objectiveId],
    queryFn: () =>
      apiClient.get<ApiSnapshot | null>(`/artifacts/${objectiveId}/snapshot`),
    enabled: !!objectiveId,
    staleTime: 30_000,
  });

  return {
    events: eventsQuery.data?.events ?? [],
    telemetry: telemetryQuery.data?.telemetry ?? [],
    snapshot: snapshotQuery.data,
    isLoading:
      eventsQuery.isLoading ||
      telemetryQuery.isLoading ||
      snapshotQuery.isLoading,
  };
}
