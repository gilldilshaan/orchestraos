import type { Objective } from "@/types";

export const mockObjectives: Objective[] = [
  {
    id: "obj_01h9x2k1",
    title: "Reduce churn 15% by Q3",
    description:
      "Cut monthly logo churn from 4.1% to under 3.5% within two quarters by fixing onboarding drop-off and shipping proactive renewal tooling for CS.",
    status: "active",
    successProbability: 74,
    businessReadiness: 88,
    createdAt: "2026-04-02T09:12:00Z",
    ownerName: "Priya Nandakumar",
    pipelineRunId: "run_9f3a1c",
  },
  {
    id: "obj_01h9x2k2",
    title: "Stand up EU entity before FY end",
    description:
      "Incorporate a Dutch subsidiary, migrate EU customer contracts, and stand up GDPR-compliant data residency ahead of the January renewal cycle.",
    status: "at_risk",
    successProbability: 52,
    businessReadiness: 61,
    createdAt: "2026-03-18T14:30:00Z",
    ownerName: "Marcus Webb",
  },
  {
    id: "obj_01h9x2k3",
    title: "Launch self-serve pricing tier",
    description:
      "Ship a credit-card-only plan under $99/mo to capture the long tail currently lost to sales-cycle friction, targeting 300 self-serve signups in month one.",
    status: "compiling",
    successProbability: 66,
    businessReadiness: 70,
    createdAt: "2026-07-20T11:00:00Z",
    ownerName: "Elena Sokolova",
  },
  {
    id: "obj_01h9x2k4",
    title: "Cut cloud infra spend 20% without SLA regression",
    description:
      "Right-size compute, move cold storage to lower tiers, and renegotiate the Snowflake contract to bring monthly infra cost from $340K to $272K by end of Q4.",
    status: "active",
    successProbability: 81,
    businessReadiness: 92,
    createdAt: "2026-02-05T08:45:00Z",
    ownerName: "David Chen",
  },
  {
    id: "obj_01h9x2k5",
    title: "Expand enterprise sales motion into APAC",
    description:
      "Hire a 4-person APAC sales pod, localize contracts for Singapore and Japan, and close 3 six-figure logos in the region within the fiscal year.",
    status: "draft",
    successProbability: 43,
    businessReadiness: 38,
    createdAt: "2026-07-25T16:20:00Z",
    ownerName: "Amara Okafor",
  },
  {
    id: "obj_01h9x2k6",
    title: "Achieve SOC 2 Type II certification",
    description:
      "Close remaining control gaps from the readiness assessment and pass the 6-month observation window to unblock two enterprise deals currently stalled on compliance.",
    status: "active",
    successProbability: 89,
    businessReadiness: 95,
    createdAt: "2026-01-14T10:00:00Z",
    ownerName: "Sofia Marchetti",
  },
  {
    id: "obj_01h9x2k7",
    title: "Rebuild onboarding flow to cut TTV under 10 minutes",
    description:
      "Redesign first-run setup to move time-to-first-value from 34 minutes to under 10, removing the manual CSV import step for 70% of new workspaces.",
    status: "completed",
    successProbability: 91,
    businessReadiness: 100,
    createdAt: "2025-11-02T09:00:00Z",
    ownerName: "Priya Nandakumar",
  },
  {
    id: "obj_01h9x2k8",
    title: "Consolidate three billing systems into one",
    description:
      "Migrate legacy Stripe, Chargebee, and manual-invoice workflows onto a single billing core to eliminate $180K/yr in reconciliation overhead.",
    status: "at_risk",
    successProbability: 58,
    businessReadiness: 64,
    createdAt: "2026-05-11T13:15:00Z",
    ownerName: "David Chen",
  },
];
