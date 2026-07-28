import { apiClient } from "@/services/api-client";
import { mockScenarios } from "@/services/mock";
import type { ApiResponse, Scenario, ScenarioLevers } from "@/types";
import { mockDelay, USE_MOCK } from "./config";

export async function getScenarios(objectiveId: string): Promise<Scenario[]> {
  if (USE_MOCK) return mockDelay(mockScenarios.filter((s) => s.objectiveId === objectiveId));
  const res = await apiClient.get<ApiResponse<Scenario[]>>(`/objectives/${objectiveId}/scenarios`);
  return res.data;
}

export async function simulateScenario(objectiveId: string, levers: ScenarioLevers): Promise<Scenario> {
  if (USE_MOCK) {
    const base = mockScenarios.find((s) => s.objectiveId === objectiveId) ?? mockScenarios[0];
    const projected = {
      successProbability: Math.min(
        99,
        Math.max(
          5,
          Math.round(
            base.baseline.successProbability +
              (levers.budgetMultiplier - 1) * 30 +
              levers.additionalHires * 3 -
              levers.timelineWeeksDelta * 2 -
              levers.scopeReductionPercent * 0.2,
          ),
        ),
      ),
      costEstimate: Math.round(base.baseline.costEstimate * levers.budgetMultiplier + levers.additionalHires * 18_000),
      timelineWeeks: Math.max(1, base.baseline.timelineWeeks + levers.timelineWeeksDelta),
      riskScore: Math.min(
        100,
        Math.max(0, Math.round(base.baseline.riskScore - levers.scopeReductionPercent * 0.3 - levers.additionalHires * 2)),
      ),
    };
    return mockDelay({ ...base, levers, projected }, 500);
  }
  const res = await apiClient.post<ApiResponse<Scenario>>(`/objectives/${objectiveId}/scenarios/simulate`, levers);
  return res.data;
}
