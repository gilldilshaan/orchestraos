"use client";

import { motion } from "motion/react";
import { useLatestObjectiveIdQuery, useObjectiveQuery } from "@/hooks/use-api";
import { HealthBadge } from "@/components/health-badge";

export default function ObjectivePage() {
  const { data: objectiveId, isLoading: idLoading } = useLatestObjectiveIdQuery();
  const { data: objective, isLoading: objLoading, error } = useObjectiveQuery(objectiveId);

  const isLoading = idLoading || objLoading;
  const compilation = objective?.compilation as Record<string, unknown> | null | undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading objective...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-8">
        <h1 className="text-lg font-semibold tracking-tight">Objective</h1>
        <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Failed to load objective data.</p>
        </div>
      </div>
    );
  }

  if (!objective) {
    return (
      <div className="space-y-6 p-8">
        <h1 className="text-lg font-semibold tracking-tight">Objective</h1>
        <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No objective found. Create a new run to generate an objective.
          </p>
        </div>
      </div>
    );
  }

  const status = objective.status as string;
  const TERMINAL = new Set(["completed", "failed", "cancelled"]);
  const badgeStatus = TERMINAL.has(status)
    ? status as "completed" | "failed"
    : "running" as const;

  return (
    <div className="space-y-6 p-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Objective</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Business objective and compilation details
            </p>
          </div>
          <div className="flex items-center gap-2">
            {objective.confidence != null && (
              <span className="text-xs text-muted-foreground">
                Confidence: {(objective.confidence * 100).toFixed(0)}%
              </span>
            )}
            <HealthBadge status={badgeStatus} size="sm" />
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
            Raw Input
          </div>
          <p className="mt-1.5 text-sm">{objective.raw_input}</p>
        </div>

        {objective.current_stage && (
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Current Stage
            </div>
            <p className="mt-1.5 text-sm">{objective.current_stage}</p>
          </div>
        )}

        {compilation && (
          <>
            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Mission
              </div>
              <p className="mt-1.5 text-sm">{(compilation.mission as string) ?? "—"}</p>
            </div>

            <div className="rounded-lg border border-border/50 bg-card p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Vision
              </div>
              <p className="mt-1.5 text-sm">{(compilation.vision as string) ?? "—"}</p>
            </div>

            {compilation.constraints && Array.isArray(compilation.constraints) && compilation.constraints.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-card p-5">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Constraints
                </div>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {(compilation.constraints as string[]).map((c: string, i: number) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {compilation.kpis && Array.isArray(compilation.kpis) && compilation.kpis.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-card p-5">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  KPIs
                </div>
                <div className="space-y-2">
                  {(compilation.kpis as Array<{ name: string; target: string }>).map((kpi: { name: string; target: string }, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                      <span className="text-sm">{kpi.name}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">{kpi.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {compilation.timeline && typeof compilation.timeline === "object" && (
              <div className="rounded-lg border border-border/50 bg-card p-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Timeline
                </div>
                <p className="mt-1.5 text-sm">
                  {(compilation.timeline as Record<string, unknown>).total_months as string ?? "—"} months, {(compilation.timeline as Record<string, unknown>).phases as string ?? "—"} phases
                </p>
              </div>
            )}

            {compilation.budget && typeof compilation.budget === "object" && (
              <div className="rounded-lg border border-border/50 bg-card p-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Budget
                </div>
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
