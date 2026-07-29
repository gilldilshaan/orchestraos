"use client";

import { motion } from "motion/react";
import { useRecentRuns } from "@/hooks/use-dashboard";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import Link from "next/link";

export function RecentRuns() {
  const { runs } = useRecentRuns();

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-300 hover:border-border/80"
    >
      <div className="relative">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
          <h2 className="text-sm font-semibold">Recent Runs</h2>
          <Link
            href="/runs"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                {["Objective", "Runtime", "Confidence", "Nodes", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => (
                <motion.tr
                  key={run.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.04, ease: [0.32, 0.72, 0, 1] }}
                  className="group/row cursor-pointer border-b border-border/20 transition-colors hover:bg-muted/30 last:border-0"
                >
                  <td className="px-5 py-3">
                    <div>
                      <span className="text-sm font-medium">{run.objective}</span>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {run.id}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                    {run.duration.toFixed(1)}s
                  </td>
                  <td className="px-5 py-3">
                    <ConfidenceBar
                      value={run.confidence}
                      size="sm"
                      className="w-20"
                      showValue
                    />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                    {run.node_count}
                  </td>
                  <td className="px-5 py-3">
                    <HealthBadge status={run.status} size="sm" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
