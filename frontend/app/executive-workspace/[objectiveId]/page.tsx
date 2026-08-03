"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gavel, Users, Scale, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw, Plus, Target, BarChart2, ClipboardList, Lightbulb, Shield, Zap, Settings, ChevronRight, Building2 } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useEnsureWorkspace } from "@/hooks/use-api";

import { PageHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { ExecutiveWorkspace, ExecutiveRole } from "@/types";

const ROLE_ICONS: Record<ExecutiveRole, React.ReactNode> = {
  CEO: <Gavel className="h-5 w-5" />,
  Planner: <Target className="h-5 w-5" />,
  Engineering: <Zap className="h-5 w-5" />,
  Finance: <Scale className="h-5 w-5" />,
  Marketing: <MessageSquare className="h-5 w-5" />,
  Legal: <Shield className="h-5 w-5" />,
  Risk: <AlertTriangle className="h-5 w-5" />,
  Operations: <Users className="h-5 w-5" />,
};

const ROLE_DESCRIPTIONS: Record<ExecutiveRole, string> = {
  CEO: "Chair the board, weigh every voice, and issue the final decision.",
  Planner: "Own execution sequencing, milestones, and delivery feasibility.",
  Engineering: "Own technical feasibility, build capacity, and delivery risk.",
  Finance: "Own budget adequacy, unit economics, and return on investment.",
  Marketing: "Own market traction, adoption assumptions, and go-to-market spend.",
  Legal: "Own compliance, regulatory exposure, and contractual liability.",
  Risk: "Own risk exposure, uncertainty, and mitigation coverage.",
  Operations: "Own capacity, staffing, and operational readiness.",
};

const EXECUTIVE_ROLES: ExecutiveRole[] = [
  "CEO",
  "Planner",
  "Engineering",
  "Finance",
  "Marketing",
  "Legal",
  "Risk",
  "Operations",
];

export default function ExecutiveWorkspaceListPage() {
  const params = useParams();
  const router = useRouter();
  const objectiveId = params.objectiveId as string;

  const { data: workspacesData, isLoading: workspacesLoading } = useQuery({
    queryKey: ["executive-workspace", "list", objectiveId],
    queryFn: () => apiClient.get<{ workspaces: ExecutiveWorkspace[] }>(`/executive-workspace/${objectiveId}`),
    enabled: !!objectiveId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const workspaces = workspacesData?.data?.workspaces ?? [];
  const workspaceByRole = new Map(workspaces.map((w) => [w.executive_role, w]));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Executive Workspace"
        title="All Executive Roles"
        description="View and enter each executive's personal workspace for this objective."
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push("/executive-workspace")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Objectives
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <PremiumCard variant="glass" className="p-5">
            <h3 className="mb-4 font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Executive Roster
            </h3>
            <div className="space-y-3">
              {EXECUTIVE_ROLES.map((role) => {
                const ws = workspaceByRole.get(role);
                return (
                  <Link
                    key={role}
                    href={`/executive-workspace/${objectiveId}/${role}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      {ROLE_ICONS[role]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{role}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {ROLE_DESCRIPTIONS[role]}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {ws && (
                        <Badge variant={ws.status === "active" ? "default" : "secondary"} className="text-xs">
                          {ws.status}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </PremiumCard>

          {workspaces.length > 0 && (
            <PremiumCard variant="glass" className="p-5">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Quick Stats
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Active Workspaces"
                  value={workspaces.filter((w) => w.status === "active").length}
                  icon={<Users className="h-5 w-5" />}
                  tone="primary"
                />
                <StatCard
                  label="Total Roles"
                  value={EXECUTIVE_ROLES.length}
                  icon={<Target className="h-5 w-5" />}
                  tone="secondary"
                />
                <StatCard
                  label="Objective"
                  value={objectiveId.slice(0, 8) + "..."}
                  icon={<ClipboardList className="h-5 w-5" />}
                  tone="success"
                />
                <StatCard
                  label="Roles Ready"
                  value={workspaces.filter((w) => w.status === "active").length + "/" + EXECUTIVE_ROLES.length}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  tone="warning"
                />
              </div>
            </PremiumCard>
          )}
        </div>

        <aside className="space-y-6">
          <PremiumCard variant="glass" className="p-5">
            <h3 className="mb-4 font-semibold flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Executive Workspace
            </h3>
            <p className="text-muted-foreground mb-4">
              Each executive role gets a personalized workspace with partitioned memory,
              task tracking, KPIs, and live updates from board sessions.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">1.</span>Memory partitioned by role</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">2.</span>Personal task & decision tracking</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">3.</span>Role-specific KPIs</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">4.</span>Live SSE updates from board</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">5.</span>Auto-created from board sessions</li>
            </ul>
          </PremiumCard>

          <PremiumCard variant="glass" className="p-5 border-primary/30">
            <h3 className="mb-3 font-semibold flex items-center gap-2 text-primary">
              <Zap className="h-5 w-5" />
              How It Works
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="flex-shrink-0">1.</span>Board convenes on an objective</li>
              <li className="flex gap-2"><span className="flex-shrink-0">2.</span>Each executive contributes perspective</li>
              <li className="flex gap-2"><span className="flex-shrink-0">3.</span>Workspace auto-created per role</li>
              <li className="flex gap-2"><span className="flex-shrink-0">4.</span>Memories, items, KPIs partitioned</li>
              <li className="flex gap-2"><span className="flex-shrink-0">5.</span>Live SSE stream per workspace</li>
            </ol>
          </PremiumCard>
        </aside>
      </div>
    </div>
  );
}