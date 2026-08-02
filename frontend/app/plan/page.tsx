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
import { ConfidenceBar } from "@/components/confidence-bar";
import { FileText, ShieldAlert, Scale, CheckCircle2, Circle } from "lucide-react";

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
  const dashPlan = dashboard?.plan;
  const progress = dashPlan?.progress_percent ?? (milestones.length ? Math.round((milestones.filter((m) => m.status === "completed" || m.status === "done").length / milestones.length) * 100) : 0);
  const topRisks = dashboard?.risks?.top_risks ?? [];
  const pendingDecisions = dashboard?.decisions?.pending_decisions ?? [];
  const riskLevelTone: Record<string, string> = {
    low: "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
    medium: "border-amber-500/20 bg-amber-500/8 text-amber-400",
    high: "border-red-500/20 bg-red-500/8 text-red-400",
    critical: "border-red-500/30 bg-red-500/15 text-red-400",
  };

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
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="bento-tile-accent relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="section-kicker">Overall Progress</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-2xl font-semibold tabular tracking-tight text-foreground/90">
                  {Math.round(progress)}%
                </span>
                {progress >= 100 ? (
                  <span className="chip text-success">all milestones complete</span>
                ) : (
                  <span className="chip">
                    {dashPlan?.completed_milestones ?? 0}/{dashPlan?.milestone_count ?? milestones.length} milestones
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="section-kicker">Confidence</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-foreground/70">
                  {plan.confidence != null ? `${(plan.confidence * 100).toFixed(0)}%` : "—"}
                </div>
              </div>
              <div>
                <div className="section-kicker">Version</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-foreground/70">v{plan.plan_version ?? "—"}</div>
              </div>
              <div>
                <div className="section-kicker">Milestones</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-foreground/70">
                  {milestones.length}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/50"
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bento-tile p-5">
            <SectionHeader title="Name" />
            <p className="mt-1.5 text-sm">{plan.name}</p>
          </div>

          <div className="bento-tile p-5">
            <SectionHeader title="Description" />
            <p className="mt-1.5 text-sm">{plan.description ?? "—"}</p>
          </div>
        </div>

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
                    <div className="flex items-center gap-2">
                      {ms.status === "completed" || ms.status === "done" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                      )}
                      <div>
                        <div className="text-sm font-medium">{ms.name}</div>
                        {ms.description && (
                          <div className="text-xs text-muted-foreground">{ms.description}</div>
                        )}
                      </div>
                    </div>
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
