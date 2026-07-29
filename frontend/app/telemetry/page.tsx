"use client";

import { motion } from "motion/react";

export default function TelemetryPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Telemetry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time event stream and observability data
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl border border-border/50 bg-card p-8 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Telemetry is not yet available. Real-time observability (token usage, LLM calls, runtime, cost, stage timings, errors) will be exposed once the telemetry backend service is implemented.
        </p>
      </motion.div>
    </div>
  );
}
