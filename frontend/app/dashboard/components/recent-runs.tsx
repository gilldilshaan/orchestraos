"use client";

import { motion } from "motion/react";
import { useRecentRuns } from "@/hooks/use-dashboard";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function RecentRuns() {
  const { runs } = useRecentRuns();

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="enterprise-panel"
    >
      <div className="relative">
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground/80">Recent Runs</h2>
          <Link
            href="/runs"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground/50 transition-colors hover:text-foreground/60"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/15">
                {["Objective", "Runtime", "Confidence", "Nodes", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/30"
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
                  className="group/row cursor-pointer border-b border-border/10 transition-colors hover:bg-muted/15 last:border-0"
                >
                  <td className="px-5 py-3">
                    <div>
                      <span className="text-sm font-medium text-foreground/80">{run.objective}</span>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/30">
                        {run.id}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted-foreground/50">
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
                  <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted-foreground/50">
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
