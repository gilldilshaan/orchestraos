"use client";

import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { useDashboardsQuery } from "@/hooks/use-api";

function runtimeSeconds(createdAt: string | null, updatedAt: string | null, isTerminal: boolean): number {
  if (!createdAt) return 0;
  const start = new Date(createdAt).getTime();
  const end = isTerminal && updatedAt ? new Date(updatedAt).getTime() : Date.now();
  return Math.max(0, (end - start) / 1000);
}

export default function RunsPage() {
  const { data: dashboards } = useDashboardsQuery();

  const TERMINAL_STATES = new Set(["completed", "failed", "cancelled"]);
  const runs = (dashboards ?? []).map((d) => {
    const objStatus = d.objective?.status ?? "";
    const isTerminal = TERMINAL_STATES.has(objStatus);
    return {
      id: d.objective?.id ?? "—",
      objective: d.objective?.summary ?? "Unknown Objective",
      date: d.objective?.created_at ?? null,
      duration: runtimeSeconds(d.objective?.created_at ?? null, d.objective?.updated_at ?? null, isTerminal),
      confidence: d.objective?.confidence ?? null,
      nodes: d.organization?.total_head_count ?? 0,
      status: objStatus === "completed" ? "completed" as const : objStatus === "failed" ? "failed" as const : "running" as const,
    };
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">
          Historical Runs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Past execution runs and their results
        </p>
      </motion.div>

      {runs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No runs yet. Start a new run to see execution history.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-lg border border-border/50 bg-card"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Run
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Objective
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Duration
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Nodes
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Confidence
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {runs.map((run, i) => (
                  <motion.tr
                    key={run.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="cursor-pointer transition-colors hover:bg-muted/20"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {run.id.length > 12 ? `${run.id.slice(0, 12)}...` : run.id}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{run.objective}</td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                      {run.duration.toFixed(1)}s
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                      {run.nodes}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {run.confidence != null ? (
                        <ConfidenceBar
                          value={run.confidence}
                          size="sm"
                          className="w-20 ml-auto"
                          showValue
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <HealthBadge status={run.status} size="sm" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
