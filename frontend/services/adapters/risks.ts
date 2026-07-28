import { apiClient } from "@/services/api-client";
import { mockRisks } from "@/services/mock";
import type { ApiResponse, Risk } from "@/types";
import { mockDelay, USE_MOCK } from "./config";

export async function getRisks(objectiveId?: string): Promise<Risk[]> {
  if (USE_MOCK) {
    const risks = objectiveId ? mockRisks.filter((r) => r.objectiveId === objectiveId) : mockRisks;
    return mockDelay(risks);
  }
  const endpoint = objectiveId ? `/objectives/${objectiveId}/risks` : "/risks";
  const res = await apiClient.get<ApiResponse<Risk[]>>(endpoint);
  return res.data;
}
