import { apiClient } from "@/services/api-client";
import { mockPipelineRun } from "@/services/mock";
import type { ApiResponse, PipelineRun } from "@/types";
import { mockDelay, USE_MOCK } from "./config";

export async function getPipelineRun(objectiveId: string): Promise<PipelineRun | undefined> {
  if (USE_MOCK) {
    return mockDelay(mockPipelineRun.objectiveId === objectiveId ? mockPipelineRun : undefined);
  }
  const res = await apiClient.get<ApiResponse<PipelineRun>>(`/objectives/${objectiveId}/pipeline`);
  return res.data;
}

export async function runPipeline(objectiveId: string): Promise<PipelineRun> {
  if (USE_MOCK) return mockDelay(mockPipelineRun, 600);
  const res = await apiClient.post<ApiResponse<PipelineRun>>(`/objectives/${objectiveId}/generate`);
  return res.data;
}
