"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useSSE } from "@/hooks/use-sse-events";
import { useLatestObjectiveIdQuery, useObjectiveQuery } from "@/hooks/use-api";
import { ExecutionDAG } from "@/app/execution/components/execution-dag";

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <GraphContent />
    </Suspense>
  );
}

function GraphContent() {
  const searchParams = useSearchParams();
  const urlObjectiveId = searchParams.get("id");
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!urlObjectiveId);
  const objectiveId = urlObjectiveId ?? latestObjectiveId;
  const { data: objective } = useObjectiveQuery(objectiveId);

  useSSE(objectiveId ?? null);

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
          {objective?.status && (
            <span className="text-xs text-muted-foreground">
              {objective.status}
            </span>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-lg border border-border/50 bg-card"
        style={{ height: 600 }}
      >
        {objectiveId ? (
          <ExecutionDAG />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No execution data available. Run a pipeline to see the execution graph.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
