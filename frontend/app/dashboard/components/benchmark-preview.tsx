"use client";

import { motion } from "motion/react";
import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { BarChart3 } from "lucide-react";

export function BenchmarkPreview() {
  const { metrics } = useAggregateMetrics();

  const benchmarks = [
    { label: "Total Runs", value: metrics.totalRuns, color: "text-primary/70" },
    { label: "Success Rate", value: `${Math.round((metrics.successRate ?? 0) * 100)}%`, color: "text-success/70" },
    { label: "Avg. Confidence", value: `${Math.round((metrics.avgConfidence ?? 0) * 100)}%`, color: "text-primary/70" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: [0.32, 0.72, 0, 1] }}
      className="enterprise-panel p-5"
    >
      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground/50" />
          <h2 className="text-sm font-semibold text-foreground/80">Aggregate Metrics</h2>
        </div>

        {metrics.totalRuns > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {benchmarks.map((b) => (
              <div key={b.label} className="rounded-lg border border-border/20 bg-background/30 p-3">
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
                  {b.label}
                </div>
                <div className={`mt-1 font-mono text-lg font-semibold ${b.color}`}>
                  {b.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border/20 bg-muted/10 p-4 text-center">
            <p className="text-sm text-muted-foreground/40">
              No data available yet. Run a pipeline to see metrics.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}
