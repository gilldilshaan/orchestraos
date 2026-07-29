"use client";

import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";

export default function GraphPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Execution Graph
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Directed acyclic graph of execution with parallel groups and critical path
            </p>
          </div>
          <HealthBadge status="completed" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-lg border border-border/50 bg-card"
      >
        <div className="flex h-[600px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
      DAG visualization loading...
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              React Flow will render the execution DAG here
            </p>
          </div>
        </div>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex flex-wrap gap-4 rounded-lg border border-border/50 bg-card px-5 py-3"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-3 w-3 rounded-full bg-primary" />
          Running
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-3 w-3 rounded-full bg-success" />
          Completed
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-3 w-3 rounded-full bg-destructive" />
          Failed
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-3 w-3 rounded-full bg-warning" />
          Retry
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
          Pending
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-0.5 w-6 bg-amber-500" />
          Critical Path
        </div>
      </motion.div>
    </div>
  );
}
