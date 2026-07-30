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
import { useEventsQuery, useTelemetryQuery } from "@/hooks/use-api";
import { StatusBadge } from "@/components/status-badge";
import { OrganizationUniverse } from "@/components/3d/scene-wrapper";
import { useToastStore } from "@/lib/use-toast";
import {
  AlertTriangle, XCircle, RotateCcw, ChevronDown,
} from "lucide-react";

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
  const { data: persistedEvents } = useEventsQuery(objectiveId);
  const { data: persistedTelemetry } = useTelemetryQuery(objectiveId);
  const [showFailureAnalysis, setShowFailureAnalysis] = useState(false);

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

      if (ssePipelineStatus === "completed") {
        addToast({
          title: "Pipeline Completed",
          description: "All stages finished successfully",
          variant: "success",
          duration: 5000,
        });
      } else if (ssePipelineStatus === "completed_with_errors") {
        addToast({
          title: "Completed with Errors",
          description: "Some stages failed but pipeline completed",
          variant: "success",
          duration: 6000,
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

  // Source of truth: REST API for terminal, SSE for live
  const restTerminal = run.status === "completed" || run.status === "failed";
  const sseTerminal =
    ssePipelineStatus === "completed" ||
    ssePipelineStatus === "completed_with_errors" ||
    ssePipelineStatus === "error";
  const hasLiveEvents = sseEvents.some((e) => e.stage !== "pipeline" || e.status !== "connected");

  const healthStatus =
    restTerminal
      ? run.status
      : sseTerminal
        ? ssePipelineStatus === "error" ? "failed" : "completed"
        : sseConnected && hasLiveEvents
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

  // Stage count from SSE events (live) or persisted events (after refresh)
  useEffect(() => {
    const source = sseEvents.length > 0 ? sseEvents : (persistedEvents ?? []);
    if (!source.length) return;
    const stages = new Set(source.filter((e: { stage: string }) => e.stage !== "pipeline").map((e: { stage: string }) => e.stage));
    setTotalSteps(stages.size);
    const completed = new Set(source.filter((e: { stage: string; status: string }) => e.status === "completed" && e.stage !== "pipeline").map((e: { stage: string }) => e.stage));
    setCompletedStepNames(Array.from(completed));
  }, [sseEvents, persistedEvents]);

  // Failure analysis data
  const failedEvents = useMemo(() => {
    const source = sseEvents.length > 0 ? sseEvents : (Array.isArray(persistedEvents) ? persistedEvents : []);
    return source.filter((e: { stage: string; status: string }) => e.status === "error" && e.stage !== "pipeline");
  }, [sseEvents, persistedEvents]);

  const failedTelemetry = useMemo(() => {
    if (!Array.isArray(persistedTelemetry)) return [];
    return persistedTelemetry.filter((t) => t.status === "failed" || t.error != null);
  }, [persistedTelemetry]);

  const isFailed = healthStatus === "failed" || ssePipelineStatus === "error";

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

      {/* Failure Analysis Panel */}
      {isFailed && (failedEvents.length > 0 || failedTelemetry.length > 0) && (
        <div className="border-t border-red-500/20 bg-red-500/5">
          <button
            onClick={() => setShowFailureAnalysis(!showFailureAnalysis)}
            className="flex w-full items-center justify-between px-4 py-2 text-left"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-xs font-semibold text-red-400">Failure Analysis</span>
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                {failedEvents.length} errors
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-red-400/60 transition-transform", showFailureAnalysis && "rotate-180")} />
          </button>
          {showFailureAnalysis && (
            <div className="border-t border-red-500/10 px-4 py-3 space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin">
              {/* Failed events */}
              {failedEvents.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-1.5 text-[11px] font-medium text-red-400 mb-2">
                    <XCircle className="h-3.5 w-3.5" />
                    Failed Stages
                  </h4>
                  <div className="space-y-1.5">
                    {failedEvents.map((ev: any, i: number) => (
                      <div key={ev.id ?? i} className="rounded-md bg-red-500/10 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-red-400">{ev.stage}</span>
                          {ev.created_at && (
                            <span className="font-mono text-[9px] tabular-nums text-red-400/50">
                              {new Date(ev.created_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        {ev.message && (
                          <p className="mt-0.5 font-mono text-[10px] text-red-300/80">{ev.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed telemetry */}
              {failedTelemetry.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-1.5 text-[11px] font-medium text-red-400 mb-2">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Failed Agents
                  </h4>
                  <div className="space-y-1.5">
                    {failedTelemetry.map((t, i) => (
                      <div key={t.id ?? i} className="rounded-md bg-red-500/10 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-red-400">{t.agent_name ?? t.agent_id}</span>
                          <span className="text-[10px] text-red-400/70">{t.stage}</span>
                          {t.retries > 0 && (
                            <span className="text-[10px] text-amber-400/70">Retries: {t.retries}</span>
                          )}
                        </div>
                        {t.error && (
                          <p className="mt-0.5 font-mono text-[10px] text-red-300/80">{t.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <MetricsRibbon />
    </div>
  );
}
