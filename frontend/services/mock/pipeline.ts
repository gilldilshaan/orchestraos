import type { PipelineRun, PipelineStage, PipelineStageName } from "@/types";

interface StageDef {
  name: PipelineStageName;
  order: number;
  summary: string;
  confidence: number;
}

const queuedStageDefs: Array<Pick<StageDef, "name" | "order">> = [
  { name: "dependency_analysis", order: 9 },
  { name: "bottleneck_detection", order: 10 },
  { name: "executive_dashboard", order: 11 },
  { name: "scenario_simulation", order: 12 },
  { name: "explainable_ai", order: 13 },
];

const completedStageDefs: StageDef[] = [
  {
    name: "compiler",
    order: 1,
    summary:
      "Parsed objective into a structured brief: reduce logo churn from 4.1% to 3.5%, timeframe two quarters, primary levers = onboarding and renewal tooling.",
    confidence: 0.94,
  },
  {
    name: "business_readiness",
    order: 2,
    summary:
      "88/100 readiness — CS headcount and churn telemetry are in place; renewal-automation tooling is the main gap.",
    confidence: 0.91,
  },
  {
    name: "planner",
    order: 3,
    summary: "Drafted a 6-milestone plan across Product, CS, and Data spanning 9 weeks.",
    confidence: 0.87,
  },
  {
    name: "organization",
    order: 4,
    summary: "Assigned 3 departments (Product, Customer Success, Data & Analytics) and 11 roles to the plan.",
    confidence: 0.9,
  },
  {
    name: "risk",
    order: 5,
    summary: "Identified 6 risks, 2 rated high — onboarding redesign scope creep and CS tooling vendor lead time.",
    confidence: 0.83,
  },
  {
    name: "decision",
    order: 6,
    summary: "Surfaced 2 decisions requiring exec sign-off: build vs. buy renewal tooling, and onboarding redesign scope.",
    confidence: 0.79,
  },
  {
    name: "devils_advocate",
    order: 7,
    summary:
      "Challenged the buy-vs-build assumption — vendor lock-in risk understated relative to the 6-week build estimate.",
    confidence: 0.72,
  },
];

const runningStageDef: StageDef = {
  name: "resource_gap",
  order: 8,
  summary: "Flagged a 1.5 FTE gap in CS Ops for weeks 4-6 of the plan.",
  confidence: 0.85,
};

const t0 = "2026-07-28T09:00:00Z";
const gapMinutes = (n: number) => new Date(new Date(t0).getTime() + n * 60_000).toISOString();

const completedStages: PipelineStage[] = completedStageDefs.map((def, i) => ({
  id: `stage_${def.name}`,
  name: def.name,
  order: def.order,
  status: "complete",
  startedAt: gapMinutes(i * 4),
  completedAt: gapMinutes(i * 4 + 3),
  summary: def.summary,
  confidence: def.confidence,
}));

const runningStage: PipelineStage = {
  id: `stage_${runningStageDef.name}`,
  name: runningStageDef.name,
  order: runningStageDef.order,
  status: "running",
  startedAt: gapMinutes(completedStageDefs.length * 4),
  summary: runningStageDef.summary,
  confidence: runningStageDef.confidence,
};

const queuedStages: PipelineStage[] = queuedStageDefs.map((def) => ({
  id: `stage_${def.name}`,
  name: def.name,
  order: def.order,
  status: "queued",
}));

export const mockPipelineRun: PipelineRun = {
  id: "run_9f3a1c",
  objectiveId: "obj_01h9x2k1",
  startedAt: t0,
  stages: [...completedStages, runningStage, ...queuedStages],
};
