"use client";

import { apiClient } from "@/lib/api-client";
import type { ApiObjective } from "@/hooks/use-api";

interface CreateObjectiveBody {
  raw_input: string;
}

interface CreateObjectiveResponse {
  id: string;
  raw_input: string;
  status: string;
}

export async function createObjective(
  rawInput: string,
): Promise<CreateObjectiveResponse> {
  return apiClient.post<CreateObjectiveResponse>("/objectives", {
    raw_input: rawInput,
  } satisfies CreateObjectiveBody);
}

// The full pipeline runs 13 sequential steps, several with their own LLM
// calls, and can take minutes depending on the configured provider/model —
// far longer than apiClient's default 15s request timeout.
const PIPELINE_TIMEOUT_MS = 300_000;

export async function runPipeline(
  objectiveId: string,
): Promise<Record<string, unknown>> {
  return apiClient.post<Record<string, unknown>>(
    `/objectives/${objectiveId}/generate`,
    undefined,
    PIPELINE_TIMEOUT_MS,
  );
}

export async function getObjectiveStatus(
  objectiveId: string,
): Promise<ApiObjective> {
  return apiClient.get<ApiObjective>(`/objectives/${objectiveId}`);
}
