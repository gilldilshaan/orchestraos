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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl border border-border/50 bg-card p-8 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Benchmark data is not yet available. Cross-architecture comparisons will be generated once the BenchmarkRun model and backend service are implemented.
        </p>
      </motion.div>
    </div>
  );
}
