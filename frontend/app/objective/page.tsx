"use client";

import { motion } from "motion/react";
import { useLatestObjectiveIdQuery, useObjectiveQuery, useDashboardQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { HealthBadge } from "@/components/health-badge";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/skeleton";
import { DataTable, DataTableRow, DataTableCell, TablePill } from "@/components/data-table";
import { ConfidenceBar } from "@/components/confidence-bar";
import { ShieldAlert, Scale } from "lucide-react";
import { Target } from "lucide-react";

export default function ObjectivePage() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId, isLoading: idLoading } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: objective, isLoading: objLoading, error } = useObjectiveQuery(objectiveId);
  const { data: dashboard } = useDashboardQuery(objectiveId);

  const isLoading = idLoading || objLoading;
  const compilation = objective?.compilation as Record<string, unknown> | null | undefined;
  const topRisks = dashboard?.risks?.top_risks ?? [];
  const pendingDecisions = dashboard?.decisions?.pending_decisions ?? [];
  const riskLevelTone: Record<string, string> = {
    low: "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
    medium: "border-amber-500/20 bg-amber-500/8 text-amber-400",
    high: "border-red-500/20 bg-red-500/8 text-red-400",
    critical: "border-red-500/30 bg-red-500/15 text-red-400",
  };

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
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bento-tile p-5">
                <SectionHeader title="Mission" />
                <p className="mt-1.5 text-sm">{(compilation.mission as string) ?? "—"}</p>
              </div>

              <div className="bento-tile p-5">
                <SectionHeader title="Vision" />
                <p className="mt-1.5 text-sm">{(compilation.vision as string) ?? "—"}</p>
              </div>
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

            <div className="grid gap-4 lg:grid-cols-2">
              {typeof compilation.timeline === "object" && compilation.timeline != null && (
                <div className="bento-tile p-5">
                  <SectionHeader title="Timeline" />
                  <p className="mt-1.5 text-sm">
                    {(compilation.timeline as Record<string, unknown>).total_months as string ?? "—"} months, {(compilation.timeline as Record<string, unknown>).phases as string ?? "—"} phases
                  </p>
                </div>
              )}

              {typeof compilation.budget === "object" && compilation.budget != null && (
                <div className="bento-tile p-5">
                  <SectionHeader title="Budget" />
                  <p className="mt-1.5 text-sm">
                    ${(compilation.budget as Record<string, unknown>).total as string ?? "—"} {(compilation.budget as Record<string, unknown>).currency as string ?? ""}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bento-tile p-5">
            <SectionHeader
              title="Top Risks"
              actions={<ShieldAlert className="h-3.5 w-3.5 text-destructive" />}
              className="mb-3"
            />
            {topRisks.length > 0 ? (
              <div className="space-y-2.5">
                {topRisks.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border/10 bg-background/30 px-3 py-2">
                    <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${riskLevelTone[r.risk_level] ?? "border-border/20 bg-muted/20 text-muted-foreground/60"}`}>
                      {r.risk_level}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">{r.title}</span>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/40">
                      {Math.round(r.probability * 100)}% × {Math.round(r.impact * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40">
                No risks identified. Risk analysis runs after planning completes.
              </p>
            )}
          </div>

          <div className="bento-tile p-5">
            <SectionHeader
              title="Pending Decisions"
              actions={<Scale className="h-3.5 w-3.5 text-primary" />}
              className="mb-3"
            />
            {pendingDecisions.length > 0 ? (
              <div className="space-y-2.5">
                {pendingDecisions.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border/10 bg-background/30 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">{d.title}</span>
                    <ConfidenceBar value={d.confidence} size="sm" className="w-20 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40">
                No decisions pending. Decisions surface during execution and review.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
