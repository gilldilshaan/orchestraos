"use client";

import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { PanelLayout } from "./components/panel-layout";
import { TimelinePanel } from "./components/timeline-panel";
import { OrgGraph } from "./components/org-graph";
import { ExecutionDAG } from "./components/execution-dag";
import { InspectorPanel } from "./components/inspector-panel";
import { TopToolbar } from "./components/top-toolbar";
import { MetricsRibbon } from "./components/metrics-ribbon";
import { useViewStore } from "@/store/execution-stores";
import { useSSEStore } from "@/store/sse-store";
import { useSSE } from "@/hooks/use-sse-events";
import { useExecutionRun, useExecutionNodes } from "@/hooks/use-execution";
import { StatusBadge } from "@/components/status-badge";
import { OrganizationUniverse } from "@/components/3d/scene-wrapper";
import { useToastStore } from "@/lib/use-toast";

export default function ExecutionPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <ExecutionContent />
    </Suspense>
  );
}

function ExecutionContent() {
  const { centerView } = useViewStore();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const objectiveId = searchParams.get("id");

  useSSE(objectiveId);

  const sseCurrentStage = useSSEStore((s) => s.currentStage);
  const sseProgress = useSSEStore((s) => s.progress);
  const sseEvents = useSSEStore((s) => s.events);
  const ssePipelineStatus = useSSEStore((s) => s.pipelineStatus);
  const sseConnected = useSSEStore((s) => s.connected);
  const notifiedRef = useRef(false);

  const { run } = useExecutionRun();
  const { nodes: orgNodes } = useExecutionNodes();

  // Detect terminal status from SSE pipeline events
  useEffect(() => {
    if (!sseConnected || notifiedRef.current) return;

    const isTerminal =
      ssePipelineStatus === "completed" ||
      ssePipelineStatus === "completed_with_errors" ||
      ssePipelineStatus === "error";

    if (isTerminal) {
      notifiedRef.current = true;

      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });

      if (ssePipelineStatus === "completed" || ssePipelineStatus === "completed_with_errors") {
        addToast({
          title: "Pipeline Completed",
          description: "All stages finished successfully",
          variant: "success",
          duration: 5000,
        });
      } else {
        addToast({
          title: "Pipeline Failed",
          description: "An error occurred during execution",
          variant: "error",
          duration: 6000,
        });
      }
    }
  }, [ssePipelineStatus, sseConnected, addToast, queryClient]);

  const healthStatus =
    ssePipelineStatus === "completed" || ssePipelineStatus === "completed_with_errors"
      ? "completed"
      : ssePipelineStatus === "error"
        ? "failed"
        : sseConnected
          ? "running"
          : run.status;

  const phase = sseConnected ? sseCurrentStage : run.currentPhase;
  const progress = sseConnected ? sseProgress : run.progress;

  const universeNodes = orgNodes.map((n) => ({
    id: n.id,
    type: n.type as "ceo" | "executive" | "specialist",
    title: n.title,
    status: n.status,
    confidence: n.confidence,
    runtime: n.runtime,
  }));

  const [totalSteps, setTotalSteps] = useState(0);
  const [completedStepNames, setCompletedStepNames] = useState<string[]>([]);

  useEffect(() => {
    if (!sseEvents.length) return;
    const stages = new Set(sseEvents.filter(e => e.stage !== "pipeline").map(e => e.stage));
    setTotalSteps(stages.size);
    const completed = new Set(sseEvents.filter(e => e.status === "completed" && e.stage !== "pipeline").map(e => e.stage));
    setCompletedStepNames(Array.from(completed));
  }, [sseEvents]);

  const runtime = useMemo(() => {
    if (!sseEvents.length) return run.eta ?? "—";
    const first = sseEvents[0];
    const last = sseEvents[sseEvents.length - 1];
    if (!first.timestamp || !last.timestamp) return "—";
    const diff = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }, [sseEvents, run.eta]);

  return (
    <div className="relative flex h-[calc(100vh-var(--topbar-height)-var(--statusbar-height)-2rem)] flex-col">
      <div className="shrink-0 border-b border-border/30">
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-sm font-semibold tracking-tight">Mission Control</h1>
                <StatusBadge status={healthStatus} size="sm" />
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{run.objective}</p>
            </div>
            {progress > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="font-mono text-[11px] font-medium tabular-nums text-foreground/80">{Math.round(progress)}%</span>
              </div>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {[
              { label: "Stage", value: phase },
              { label: "Runtime", value: runtime },
              { label: "Objective ID", value: run.id.length > 10 ? run.id.slice(0, 10) + "…" : run.id, mono: true },
              { label: "Steps", value: totalSteps > 0 ? `${completedStepNames.length}/${totalSteps}` : "—" },
            ].map((chip) => (
              <span key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                <span className="text-muted-foreground/50">{chip.label}</span>
                <span className={cn("font-medium text-foreground/80", chip.mono && "font-mono tabular-nums")}>{chip.value}</span>
              </span>
            ))}
          </div>
        </div>
        <TopToolbar />
      </div>

      <div className="flex-1 min-h-0">
        <PanelLayout
          left={<TimelinePanel />}
          center={
            centerView === "organization" ? (
              <div className="h-full w-full rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                <OrganizationUniverse
                  nodes={universeNodes}
                  isExecuting={healthStatus === "running"}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <OrgGraph />
            )
          }
          right={<InspectorPanel />}
        />
      </div>

      <MetricsRibbon />
    </div>
  );
}
