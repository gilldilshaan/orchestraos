import { apiClient } from "@/services/api-client";
import { mockPlans } from "@/services/mock";
import type { ApiResponse, Plan } from "@/types";
import { mockDelay, USE_MOCK } from "./config";

export async function getPlans(objectiveId?: string): Promise<Plan[]> {
  if (USE_MOCK) {
    const plans = objectiveId ? mockPlans.filter((p) => p.objectiveId === objectiveId) : mockPlans;
    return mockDelay(plans);
  }
  const endpoint = objectiveId ? `/objectives/${objectiveId}/plan` : "/plans";
  const res = await apiClient.get<ApiResponse<Plan[]>>(endpoint);
  return res.data;
}
