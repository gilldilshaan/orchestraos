import type { Scenario } from "@/types";

export const mockScenarios: Scenario[] = [
  {
    id: "scn_01",
    objectiveId: "obj_01h9x2k1",
    name: "Baseline churn plan",
    levers: {
      budgetMultiplier: 1.0,
      additionalHires: 0,
      timelineWeeksDelta: 0,
      scopeReductionPercent: 0,
    },
    baseline: {
      successProbability: 74,
      costEstimate: 210_000,
      timelineWeeks: 9,
      riskScore: 46,
    },
    projected: {
      successProbability: 74,
      costEstimate: 210_000,
      timelineWeeks: 9,
      riskScore: 46,
    },
  },
  {
    id: "scn_02",
    objectiveId: "obj_01h9x2k2",
    name: "EU entity — accelerated",
    levers: {
      budgetMultiplier: 1.35,
      additionalHires: 2,
      timelineWeeksDelta: -3,
      scopeReductionPercent: 0,
    },
    baseline: {
      successProbability: 52,
      costEstimate: 480_000,
      timelineWeeks: 16,
      riskScore: 68,
    },
    projected: {
      successProbability: 66,
      costEstimate: 648_000,
      timelineWeeks: 13,
      riskScore: 58,
    },
  },
  {
    id: "scn_03",
    objectiveId: "obj_01h9x2k8",
    name: "Billing consolidation — reduced scope",
    levers: {
      budgetMultiplier: 0.85,
      additionalHires: 0,
      timelineWeeksDelta: 2,
      scopeReductionPercent: 25,
    },
    baseline: {
      successProbability: 58,
      costEstimate: 310_000,
      timelineWeeks: 12,
      riskScore: 61,
    },
    projected: {
      successProbability: 70,
      costEstimate: 263_500,
      timelineWeeks: 14,
      riskScore: 44,
    },
  },
];
