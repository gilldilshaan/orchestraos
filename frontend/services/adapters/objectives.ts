import { apiClient } from "@/services/api-client";
import { mockObjectives } from "@/services/mock";
import type { ApiResponse, Objective } from "@/types";
import { mockDelay, USE_MOCK } from "./config";

export async function getObjectives(): Promise<Objective[]> {
  if (USE_MOCK) return mockDelay(mockObjectives);
  const res = await apiClient.get<ApiResponse<Objective[]>>("/objectives");
  return res.data;
}

export async function getObjective(id: string): Promise<Objective | undefined> {
  if (USE_MOCK) return mockDelay(mockObjectives.find((o) => o.id === id));
  const res = await apiClient.get<ApiResponse<Objective>>(`/objectives/${id}`);
  return res.data;
}

export async function createObjective(rawInput: string): Promise<Objective> {
  if (USE_MOCK) {
    const created: Objective = {
      id: `obj_${Math.random().toString(36).slice(2, 10)}`,
      title: rawInput.slice(0, 80),
      description: rawInput,
      status: "compiling",
      successProbability: 0,
      businessReadiness: 0,
      createdAt: new Date().toISOString(),
      ownerName: "You",
    };
    return mockDelay(created, 600);
  }
  const res = await apiClient.post<ApiResponse<Objective>>("/objectives", { raw_input: rawInput });
  return res.data;
}
