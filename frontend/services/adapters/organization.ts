import { apiClient } from "@/services/api-client";
import { mockDepartments } from "@/services/mock";
import type { ApiResponse, Department } from "@/types";
import { mockDelay, USE_MOCK } from "./config";

export async function getDepartments(): Promise<Department[]> {
  if (USE_MOCK) return mockDelay(mockDepartments);
  const res = await apiClient.get<ApiResponse<Department[]>>("/organizations");
  return res.data;
}
