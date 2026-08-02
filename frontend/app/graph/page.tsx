"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useSSE } from "@/hooks/use-sse-events";
import { useLatestObjectiveIdQuery, useObjectiveQuery, useEventsQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { ExecutionDAG } from "@/app/execution/components/execution-dag";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { GitBranch } from "lucide-react";

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="h-full overflow-y-auto p-6"><PageSkeleton /></div>}>
      <GraphContent />
    </Suspense>
  );
}

function GraphContent() {
  const searchParams = useSearchParams();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const urlObjectiveId = searchParams.get("id");
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!urlObjectiveId);
  const objectiveId = urlObjectiveId ?? latestObjectiveId;

  // Sync URL param to global execution context
  useEffect(() => {
    if (urlObjectiveId) {
      setActiveObjectiveId(urlObjectiveId);
    }
  }, [urlObjectiveId, setActiveObjectiveId]);
  const { data: objective } = useObjectiveQuery(objectiveId);
  const { data: persistedEvents } = useEventsQuery(objectiveId);

  useSSE(objectiveId ?? null);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <PageHeader
          kicker="Explore"
          title="Execution Graph"
          description="Directed acyclic graph of execution with parallel groups and critical path"
          meta={objective?.status && <StatusBadge status={objective.status} size="sm" />}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bento-tile"
        style={{ height: 600 }}
      >
        {objectiveId ? (
          <ExecutionDAG persistedEvents={persistedEvents} />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon={<GitBranch className="h-5 w-5" />}
              title="No execution data"
              description="No data is available for this execution yet. Run a pipeline to generate an execution graph."
              compact
              className="w-full"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
