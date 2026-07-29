"use client";

import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";

const runs = [
  {
    id: "run_01j...",
    objective: "E-commerce Platform Expansion",
    date: "2026-07-28 12:00",
    duration: "4.2s",
    confidence: 0.92,
    nodes: 18,
    status: "completed" as const,
  },
  {
    id: "run_01i...",
    objective: "AI Customer Support System",
    date: "2026-07-28 11:30",
    duration: "3.8s",
    confidence: 0.88,
    nodes: 14,
    status: "completed" as const,
  },
  {
    id: "run_01h...",
    objective: "Supply Chain Optimization",
    date: "2026-07-28 10:45",
    duration: "2.1s",
    confidence: 0.76,
    nodes: 8,
    status: "running" as const,
  },
  {
    id: "run_01g...",
    objective: "Data Pipeline Migration",
    date: "2026-07-28 09:15",
    duration: "1.5s",
    confidence: 0.45,
    nodes: 6,
    status: "failed" as const,
  },
  {
    id: "run_01f...",
    objective: "Mobile App Launch Strategy",
    date: "2026-07-28 08:00",
    duration: "5.1s",
    confidence: 0.95,
    nodes: 22,
    status: "completed" as const,
  },
];

export default function RunsPage() {
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
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="cursor-pointer transition-colors hover:bg-muted/20"
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                    {run.id}
                  </td>
                  <td className="px-5 py-3.5 font-medium">{run.objective}</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                    {run.duration}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground">
                    {run.nodes}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ConfidenceBar
                      value={run.confidence}
                      size="sm"
                      className="w-20 ml-auto"
                      showValue
                    />
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
    </div>
  );
}
