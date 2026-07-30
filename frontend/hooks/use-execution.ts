"use client";

import { useSearchParams } from "next/navigation";
import {
  useLatestObjectiveIdQuery,
  useObjectiveQuery,
  useOrganizationQuery,
  usePlanQuery,
  useDashboardQuery,
  type ApiOrganization,
} from "./use-api";

// The execution page is navigated to with a specific run's id in the URL
// (e.g. after "New Run"). That id must stay pinned as the source of truth —
// falling back to "latest objective" here would make this page's data
// silently jump to whatever run is most recently created (see queryClient
// invalidation of the "objectives" key elsewhere), even while the URL still
// points at the original, completed run.
function useExecutionObjectiveId(): string | null | undefined {
  const searchParams = useSearchParams();
  const urlObjectiveId = searchParams.get("id");
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!urlObjectiveId);
  return urlObjectiveId ?? latestObjectiveId;
}

export interface ExecutionNodeData {
  id: string;
  type: "ceo" | "executive" | "specialist";
  title: string;
  role: string;
  status: "pending" | "ready" | "running" | "completed" | "failed" | "retrying";
  confidence: number;
  runtime: number;
  tokenUsage: number;
  retries: number;
  capabilities: string[];
  description: string;
}

const DEPT_ICON_MAP: Record<string, string> = {
  CTO: "cto",
  CFO: "cfo",
  COO: "coo",
  CMO: "cmo",
  CPO: "cpo",
};

const EXECUTIVE_TITLES: Record<string, string> = {
  cto: "Chief Technology Officer",
  cfo: "Chief Financial Officer",
  coo: "Chief Operations Officer",
  cmo: "Chief Marketing Officer",
  cpo: "Chief Product Officer",
};

function deptToExecutiveNode(
  dept: ApiOrganization["departments"][number],
): ExecutionNodeData {
  const key = DEPT_ICON_MAP[dept.name] ?? dept.name.toLowerCase();
  return {
    id: `exec_${dept.id}`,
    type: "executive",
    title: dept.name,
    role: EXECUTIVE_TITLES[key] ?? `${dept.name} Department`,
    status:
      dept.status === "active"
        ? "completed"
        : dept.status === "proposed"
          ? "ready"
          : "pending",
    confidence: 0,
    runtime: 0,
    tokenUsage: 0,
    retries: 0,
    capabilities: dept.roles.map((r) => r.title),
    description: dept.description ?? "",
  };
}

function roleToSpecialistNode(role: ApiOrganization["departments"][number]["roles"][number], deptName: string): ExecutionNodeData {
  return {
    id: `spec_${role.id}`,
    type: "specialist",
    title: role.title,
    role: `${deptName} Specialist`,
    status:
      role.status === "active"
        ? "completed"
        : role.status === "proposed"
          ? "ready"
          : "pending",
    confidence: 0,
    runtime: 0,
    tokenUsage: 0,
    retries: 0,
    capabilities: role.required_skills ?? [],
    description: role.description ?? "",
  };
}

export function useExecutionRun() {
  const objectiveId = useExecutionObjectiveId();
  const { data: objective } = useObjectiveQuery(objectiveId);
  const { data: dashboard } = useDashboardQuery(objectiveId);

  const TERMINAL = new Set(["completed", "failed", "cancelled"]);
  const status: "running" | "completed" | "failed" | "idle" =
    objective?.status === "completed"
      ? "completed"
      : objective?.status === "failed"
        ? "failed"
        : objective?.status && !TERMINAL.has(objective.status)
          ? "running"
          : "idle";

  return {
    run: {
      id: objective?.id ?? "pending",
      objective: objective?.raw_input ?? "—",
      status,
      progress: dashboard?.plan?.progress_percent ?? 0,
      currentPhase: objective?.current_stage ?? (objective?.status === "completed" ? "Completed" : "—"),
      currentExecutive: dashboard?.organization?.departments?.[0]?.name ?? "—",
      activeSpecialists: dashboard?.organization?.total_head_count ?? 0,
      eta: "—",
      startedAt: objective?.created_at ?? new Date().toISOString(),
    },
  };
}

export function useExecutionNodes() {
  const objectiveId = useExecutionObjectiveId();
  const { data: org } = useOrganizationQuery(objectiveId);

  if (!org?.departments?.length) {
    return { nodes: [] as ExecutionNodeData[] };
  }

  const nodes: ExecutionNodeData[] = [];

  for (const dept of org.departments) {
    const execNode = deptToExecutiveNode(dept);
    nodes.push(execNode);

    for (const role of dept.roles) {
      const specNode = roleToSpecialistNode(role, dept.name);
      nodes.push(specNode);
    }
  }

  return { nodes };
}


