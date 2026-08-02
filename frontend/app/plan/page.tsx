"use client";

import { motion } from "motion/react";
import { useLatestObjectiveIdQuery, useDashboardQuery, usePlanQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { HealthBadge } from "@/components/health-badge";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/skeleton";
import { DataTable, DataTableRow, DataTableCell, TablePill } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { FileText } from "lucide-react";

export default function PlanPage() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId, isLoading: idLoading } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: dashboard, isLoading: dashLoading } = useDashboardQuery(objectiveId);
  const planId = dashboard?.plan?.id ?? null;
  const { data: plan, isLoading: planLoading, error } = usePlanQuery(planId);

  const isLoading = idLoading || dashLoading || (objectiveId != null && planLoading);
  const noPlan = objectiveId != null && !dashLoading && !planId;

  if (isLoading) {
    return (
      <div className="min-h-[50vh]">
        <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="Monitor" title="Plan" description="Execution plan and milestones" />
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Failed to load plan data"
          description="The plan could not be retrieved. Try again in a moment."
        />
      </div>
    );
  }

  if (noPlan || !plan) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="Monitor" title="Plan" description="Execution plan and milestones" />
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No plan found"
          description="Run a pipeline to generate a plan. Once planning completes, the execution plan and milestones will appear here."
        />
      </div>
    );
  }

  const milestones = plan.milestones ?? [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <PageHeader
          kicker="Monitor"
          title="Plan"
          description="Execution plan and milestones"
          actions={
            <div className="flex items-center gap-2">
              {plan.confidence != null && (
                <span className="text-xs text-muted-foreground">
                  Confidence: {(plan.confidence * 100).toFixed(0)}%
                </span>
              )}
              <HealthBadge
                status={
                  plan.status === "active" ? "running" as const
                  : plan.status === "completed" ? "completed" as const
                  : plan.status === "failed" ? "failed" as const
                  : "idle" as const
                }
                size="sm"
              />
            </div>
          }
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="bento-tile p-5">
          <SectionHeader title="Name" />
          <p className="mt-1.5 text-sm">{plan.name}</p>
        </div>

        {plan.description && (
          <div className="bento-tile p-5">
            <SectionHeader title="Description" />
            <p className="mt-1.5 text-sm">{plan.description}</p>
          </div>
        )}

        {plan.plan_version != null && (
          <div className="bento-tile p-5">
            <SectionHeader title="Version" />
            <p className="mt-1.5 font-mono text-sm">v{plan.plan_version}</p>
          </div>
        )}

        {milestones.length > 0 && (
          <div className="bento-tile p-5">
            <SectionHeader title={`Milestones (${milestones.length})`} className="mb-3" />
            <DataTable headers={["Status", "Milestone", "Due"]}>
              {milestones.map((ms) => (
                <DataTableRow key={ms.id}>
                  <DataTableCell>
                    <StatusBadge status={ms.status} size="sm" />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="text-sm font-medium">{ms.name}</div>
                    {ms.description && (
                      <div className="text-xs text-muted-foreground">{ms.description}</div>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    {ms.due_date ? (
                      <TablePill>{new Date(ms.due_date).toLocaleDateString()}</TablePill>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>
          </div>
        )}

        {plan.versions && plan.versions.length > 0 && (
          <div className="bento-tile p-5">
            <SectionHeader title="Version History" className="mb-3" />
            <DataTable headers={["Version", "Created", "Summary"]}>
              {plan.versions.map((v) => (
                <DataTableRow key={v.id}>
                  <DataTableCell>
                    <TablePill>v{v.version_number}</TablePill>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="text-xs text-muted-foreground">
                    {v.diff_summary}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>
          </div>
        )}
      </motion.div>
    </div>
  );
}
