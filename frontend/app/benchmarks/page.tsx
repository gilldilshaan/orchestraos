"use client";

import { motion } from "motion/react";

export default function BenchmarksPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Benchmarks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare Single Agent, Fixed Team, and OrchestraOS architectures
        </p>
      </motion.div>

      {/* Comparison table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-lg border border-border/50 bg-card"
      >
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-sm font-medium">Architecture Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Metric
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Single Agent
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Fixed Team
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-primary">
                  OrchestraOS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                { metric: "Avg Runtime", sa: "4.2s", ft: "6.8s", oos: "3.1s", best: "oos" },
                { metric: "Avg Confidence", sa: "0.72", ft: "0.81", oos: "0.89", best: "oos" },
                { metric: "Success Rate", sa: "78%", ft: "86%", oos: "94%", best: "oos" },
                { metric: "Avg Retries", sa: "1.2", ft: "0.6", oos: "0.3", best: "oos" },
                { metric: "Peak Parallelism", sa: "1×", ft: "1×", oos: "8×", best: "oos" },
                { metric: "Node Count", sa: "1", ft: "5", oos: "18", best: "oos" },
                { metric: "Avg Tokens/Call", sa: "2,450", ft: "1,890", oos: "1,247", best: "oos" },
              ].map((row, i) => (
                <tr key={i} className="transition-colors hover:bg-muted/20">
                  <td className="px-5 py-3 font-medium">{row.metric}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {row.sa}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {row.ft}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-primary">
                    {row.oos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Charts placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <div className="rounded-lg border border-border/50 bg-card">
          <div className="border-b border-border/50 px-5 py-3">
            <h3 className="text-sm font-medium">Runtime Comparison</h3>
          </div>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Chart — Recharts
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-card">
          <div className="border-b border-border/50 px-5 py-3">
            <h3 className="text-sm font-medium">Confidence Distribution</h3>
          </div>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Chart — Recharts
          </div>
        </div>
      </motion.div>
    </div>
  );
}
