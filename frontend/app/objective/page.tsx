"use client";

import { motion } from "motion/react";
import { useLatestObjectiveIdQuery, useObjectiveQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { HealthBadge } from "@/components/health-badge";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/skeleton";
import { DataTable, DataTableRow, DataTableCell, TablePill } from "@/components/data-table";
import { Target } from "lucide-react";

export default function ObjectivePage() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId, isLoading: idLoading } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: objective, isLoading: objLoading, error } = useObjectiveQuery(objectiveId);

  const isLoading = idLoading || objLoading;
  const compilation = objective?.compilation as Record<string, unknown> | null | undefined;

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
        <PageHeader kicker="Data" title="Objective" description="Business objective and compilation details" />
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="Failed to load objective data"
          description="The objective could not be retrieved. Try again in a moment."
        />
      </div>
    );
  }

  if (!objective) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="Data" title="Objective" description="Business objective and compilation details" />
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="No objective found"
          description="Create a new run to generate an objective. Once compilation completes, the business objective and its details will appear here."
        />
      </div>
    );
  }

  const status = objective.status as string;
  const TERMINAL = new Set(["completed", "failed", "cancelled"]);
  const badgeStatus = TERMINAL.has(status)
    ? status as "completed" | "failed"
    : "running" as const;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <PageHeader
          kicker="Data"
          title="Objective"
          description="Business objective and compilation details"
          actions={
            <div className="flex items-center gap-2">
              {objective.confidence != null && (
                <span className="text-xs text-muted-foreground">
                  Confidence: {(objective.confidence * 100).toFixed(0)}%
                </span>
              )}
              <HealthBadge status={badgeStatus} size="sm" />
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
          <SectionHeader title="Raw Input" />
          <p className="mt-1.5 text-sm">{objective.raw_input}</p>
        </div>

        {objective.current_stage && (
          <div className="bento-tile p-5">
            <SectionHeader title="Current Stage" />
            <p className="mt-1.5 text-sm">{objective.current_stage}</p>
          </div>
        )}

        {compilation && (
          <>
            <div className="bento-tile p-5">
              <SectionHeader title="Mission" />
              <p className="mt-1.5 text-sm">{(compilation.mission as string) ?? "—"}</p>
            </div>

            <div className="bento-tile p-5">
              <SectionHeader title="Vision" />
              <p className="mt-1.5 text-sm">{(compilation.vision as string) ?? "—"}</p>
            </div>

            {compilation.constraints && Array.isArray(compilation.constraints) && compilation.constraints.length > 0 && (
              <div className="bento-tile p-5">
                <SectionHeader title="Constraints" className="mb-2" />
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {(compilation.constraints as string[]).map((c: string, i: number) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {compilation.kpis && Array.isArray(compilation.kpis) && compilation.kpis.length > 0 && (
              <div className="bento-tile p-5">
                <SectionHeader title="KPIs" className="mb-3" />
                <DataTable headers={["KPI", "Target"]}>
                  {(compilation.kpis as Array<{ name: string; target: string }>).map((kpi: { name: string; target: string }, i: number) => (
                    <DataTableRow key={i}>
                      <DataTableCell className="text-sm">{kpi.name}</DataTableCell>
                      <DataTableCell>
                        <TablePill>{kpi.target}</TablePill>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTable>
              </div>
            )}

            {compilation.timeline && typeof compilation.timeline === "object" && (
              <div className="bento-tile p-5">
                <SectionHeader title="Timeline" />
                <p className="mt-1.5 text-sm">
                  {(compilation.timeline as Record<string, unknown>).total_months as string ?? "—"} months, {(compilation.timeline as Record<string, unknown>).phases as string ?? "—"} phases
                </p>
              </div>
            )}

            {compilation.budget && typeof compilation.budget === "object" && (
              <div className="bento-tile p-5">
                <SectionHeader title="Budget" />
                <p className="mt-1.5 text-sm">
                  ${(compilation.budget as Record<string, unknown>).total as string ?? "—"} {(compilation.budget as Record<string, unknown>).currency as string ?? ""}
                </p>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
