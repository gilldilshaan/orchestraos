import { apiClient } from "@/services/api-client";
import { mockDashboards } from "@/services/mock";
import type { ApiResponse, DashboardData } from "@/types";
import { mockDelay, USE_MOCK } from "./config";

export async function getDashboard(objectiveId: string): Promise<DashboardData | undefined> {
  if (USE_MOCK) return mockDelay(mockDashboards[objectiveId]);
  const res = await apiClient.get<ApiResponse<DashboardData>>(`/dashboard/${objectiveId}`);
  return res.data;
}
