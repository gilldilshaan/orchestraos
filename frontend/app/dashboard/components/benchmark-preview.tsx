"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useAggregateMetrics } from "@/hooks/use-dashboard";

export function BenchmarkPreview() {
  const { metrics } = useAggregateMetrics();

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border/80"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Benchmark Comparison</h2>
          <Link
            href="/benchmarks"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View All →
          </Link>
        </div>

        <div className="rounded-lg border border-border/30 bg-muted/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {metrics.totalRuns > 0
              ? `${metrics.totalRuns} run(s) completed. Aggregate metrics shown in Runtime Metrics card.`
              : "No benchmark data yet. Complete a pipeline run to populate comparison metrics."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Cross-architecture benchmarks (Single Agent vs Fixed Team vs OrchestraOS) will be available after multiple runs.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
