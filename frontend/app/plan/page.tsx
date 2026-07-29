"use client";

import { motion } from "motion/react";
import { useLatestObjectiveIdQuery, useDashboardQuery, usePlanQuery } from "@/hooks/use-api";
import { HealthBadge } from "@/components/health-badge";
import { CheckCircle2, Circle } from "lucide-react";

export default function PlanPage() {
  const { data: objectiveId, isLoading: idLoading } = useLatestObjectiveIdQuery();
  const { data: dashboard, isLoading: dashLoading } = useDashboardQuery(objectiveId);
  const planId = dashboard?.plan?.id ?? null;
  const { data: plan, isLoading: planLoading, error } = usePlanQuery(planId);

  const isLoading = idLoading || dashLoading || (objectiveId != null && planLoading);
  const noPlan = objectiveId != null && !dashLoading && !planId;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-8">
        <h1 className="text-lg font-semibold tracking-tight">Plan</h1>
        <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Failed to load plan data.</p>
        </div>
      </div>
    );
  }

  if (noPlan || !plan) {
    return (
      <div className="space-y-6 p-8">
        <h1 className="text-lg font-semibold tracking-tight">Plan</h1>
        <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No plan found. Run a pipeline to generate a plan.
          </p>
        </div>
      </div>
    );
  }

  const milestones = plan.milestones ?? [];

  return (
    <div className="space-y-6 p-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Plan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Execution plan and milestones
            </p>
          </div>
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
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="rounded-lg border border-border/50 bg-card p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Name
          </div>
          <p className="mt-1.5 text-sm">{plan.name}</p>
        </div>

        {plan.description && (
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Description
            </div>
            <p className="mt-1.5 text-sm">{plan.description}</p>
          </div>
        )}

        {plan.plan_version != null && (
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Version
            </div>
            <p className="mt-1.5 font-mono text-sm">v{plan.plan_version}</p>
          </div>
        )}

        {milestones.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Milestones ({milestones.length})
            </div>
            <div className="space-y-2">
              {milestones.map((ms) => (
                <div
                  key={ms.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
                >
                  {ms.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{ms.name}</div>
                    {ms.description && (
                      <div className="text-xs text-muted-foreground">{ms.description}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {ms.status}
                    </div>
                    {ms.due_date && (
                      <div className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                        {new Date(ms.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {plan.versions && plan.versions.length > 0 && (
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Version History
            </div>
            <div className="space-y-2">
              {plan.versions.map((v) => (
                <div key={v.id} className="rounded-lg bg-muted/30 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">v{v.version_number}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  {v.diff_summary && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{v.diff_summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
