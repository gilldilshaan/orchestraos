"use client";

import { motion } from "motion/react";
import { useRecentRuns } from "@/hooks/use-dashboard";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import Link from "next/link";
import { ArrowRight, List } from "lucide-react";

export function RecentRuns() {
  const { runs } = useRecentRuns();

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <List className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">Recent Runs</span>
        </div>
        <Link
          href="/runs"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground/60"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="panel-body p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/10">
              {["Objective", "Runtime", "Confidence", "Nodes", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/30"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {runs.slice(0, 6).map((run, i) => (
              <motion.tr
                key={run.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.03 }}
                className="data-row"
              >
                <td className="px-6 py-3.5">
                  <div>
                    <span className="text-sm font-medium text-foreground/80">
                      {run.objective.length > 50
                        ? run.objective.slice(0, 50) + "..."
                        : run.objective}
                    </span>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/25">
                      {run.id.slice(0, 8)}...
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 font-mono text-xs tabular-nums text-muted-foreground/50">
                  {run.duration.toFixed(1)}s
                </td>
                <td className="px-6 py-3.5">
                  <ConfidenceBar
                    value={run.confidence}
                    size="sm"
                    className="w-24"
                    showValue
                  />
                </td>
                <td className="px-6 py-3.5 font-mono text-xs tabular-nums text-muted-foreground/50">
                  {run.node_count}
                </td>
                <td className="px-6 py-3.5">
                  <HealthBadge status={run.status} size="sm" />
                </td>
              </motion.tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground/40">
                  No runs yet. Start a new run to see data here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
