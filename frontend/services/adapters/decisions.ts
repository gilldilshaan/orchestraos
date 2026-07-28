import { apiClient } from "@/services/api-client";
import { mockDecisions } from "@/services/mock";
import type { ApiResponse, Decision } from "@/types";
import { mockDelay, USE_MOCK } from "./config";

export async function getDecisions(objectiveId?: string): Promise<Decision[]> {
  if (USE_MOCK) {
    const decisions = objectiveId ? mockDecisions.filter((d) => d.objectiveId === objectiveId) : mockDecisions;
    return mockDelay(decisions);
  }
  const params = objectiveId ? `?objective_id=${objectiveId}` : "";
  const res = await apiClient.get<ApiResponse<Decision[]>>(`/decisions${params}`);
  return res.data;
}

export async function approveDecision(id: string, optionId: string): Promise<Decision> {
  if (USE_MOCK) {
    const decision = mockDecisions.find((d) => d.id === id);
    if (!decision) throw new Error(`Decision ${id} not found`);
    return mockDelay({ ...decision, status: "approved", resolvedAt: new Date().toISOString() }, 300);
  }
  const res = await apiClient.post<ApiResponse<Decision>>(`/decisions/${id}/approve`, { option_id: optionId });
  return res.data;
}

export async function rejectDecision(id: string, reason: string): Promise<Decision> {
  if (USE_MOCK) {
    const decision = mockDecisions.find((d) => d.id === id);
    if (!decision) throw new Error(`Decision ${id} not found`);
    return mockDelay({ ...decision, status: "rejected", resolvedAt: new Date().toISOString() }, 300);
  }
  const res = await apiClient.post<ApiResponse<Decision>>(`/decisions/${id}/reject`, { reason });
  return res.data;
}
