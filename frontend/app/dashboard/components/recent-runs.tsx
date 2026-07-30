"use client";

import { motion } from "motion/react";
import { useRecentRuns } from "@/hooks/use-dashboard";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import Link from "next/link";
import { ArrowRight, List, History, Clock, Users, Circle } from "lucide-react";

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
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="relative mb-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20">
                <History className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <motion.div
                className="pointer-events-none absolute -inset-2 rounded-2xl border border-border/10"
                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="text-sm font-semibold text-foreground/60">No Runs Yet</p>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground/40 leading-relaxed">
              Start a New Run from the Command Center to see your execution history here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/10">
                  {["Objective", "Runtime", "Confidence", "Nodes", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/30"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 6).map((run, i) => (
                  <motion.tr
                    key={run.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="group cursor-pointer transition-all duration-150 hover:bg-muted/15"
                  >
                    <td className="px-6 py-4">
                      <Link href={`/execution?id=${run.id}`} className="block">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/8 border border-border/10">
                            <Clock className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                              {run.objective.length > 50
                                ? run.objective.slice(0, 50) + "..."
                                : run.objective}
                            </span>
                            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/25">
                              {run.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs tabular-nums text-muted-foreground/50">
                      {run.duration.toFixed(1)}s
                    </td>
                    <td className="px-6 py-4">
                      <ConfidenceBar
                        value={run.confidence}
                        size="sm"
                        className="w-24"
                        showValue
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-muted-foreground/30" />
                        <span className="font-mono text-xs tabular-nums text-muted-foreground/50">
                          {run.node_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <HealthBadge status={run.status} size="sm" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
