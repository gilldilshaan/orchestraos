import type { DashboardData } from "@/types";

export const mockDashboards: Record<string, DashboardData> = {
  obj_01h9x2k1: {
    objective: {
      id: "obj_01h9x2k1",
      summary: "Reduce churn 15% by Q3",
      status: "active",
      progress_percent: 47,
      current_step: "resource_gap",
    },
    organization: {
      departments: [
        { name: "Customer Success", status: "healthy", agent_count: 2, health_score: 77 },
        { name: "Product Engineering", status: "at_risk", agent_count: 2, health_score: 79 },
        { name: "Data & AI", status: "healthy", agent_count: 1, health_score: 83 },
      ],
      health: { overall: 79, engineering: 79, customer_success: 77, data: 83 },
    },
    plan: { id: "plan_01", milestonesComplete: 1, milestonesTotal: 6 },
    pending_decisions: 3,
    recent_activity: [
      { type: "milestone_complete", description: "Churn cohort telemetry instrumented in Data & AI", timestamp: "2026-07-27T17:40:00Z" },
      { type: "risk_flagged", description: "CS Ops staffing gap flagged for weeks 4-6", timestamp: "2026-07-27T09:12:00Z" },
      { type: "decision_created", description: "Build vs. buy renewal-automation tooling decision raised", timestamp: "2026-07-28T09:24:00Z" },
    ],
  },
};
