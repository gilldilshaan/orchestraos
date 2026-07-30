"use client";

import { Suspense, useMemo, useEffect, useRef, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import * as anime from "animejs";
import { cn } from "@/lib/utils";
import { useReplayStore } from "@/store/execution-stores";
import { useObjectiveContextStore } from "@/store";
import { useEventsQuery, useLatestObjectiveIdQuery, useTelemetryQuery, useTelemetrySummaryQuery, type ApiAgentTelemetry } from "@/hooks/use-api";
import { StatusBadge } from "@/components/status-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  DollarSign,
  Loader2,
  Activity,
  AlertTriangle,
} from "lucide-react";

const stageDisplayNames: Record<string, string> = {
  compiler: "Compilation",
  readiness: "Readiness Assessment",
  planner: "Planning",
  organization: "Organization",
  risk: "Risk Analysis",
  resource_gap: "Resource Gap Analysis",
  decision: "Decision Engine",
  devils_advocate: "Devil's Advocate Review",
  success_probability: "Success Probability",
  dependency_graph: "Dependency Graph",
  bottleneck: "Bottleneck Detection",
  dashboard: "Dashboard Aggregation",
  scenario: "Scenario Simulation",
};

const speedOptions = [0.5, 1, 2];

export default function ReplayPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <ReplayContent />
    </Suspense>
  );
}

function ReplayContent() {
  const searchParams = useSearchParams();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const urlId = searchParams.get("id");
  const { data: latestId } = useLatestObjectiveIdQuery(!urlId);
  const objectiveId = urlId ?? latestId ?? null;

  // Sync URL param to global execution context
  useEffect(() => {
    if (urlId) {
      setActiveObjectiveId(urlId);
    }
  }, [urlId, setActiveObjectiveId]);

  const { data: rawEvents } = useEventsQuery(objectiveId);
  const { data: rawTelemetry } = useTelemetryQuery(objectiveId);
  const { data: summary } = useTelemetrySummaryQuery(objectiveId);

  const events = useMemo(() => rawEvents ?? [], [rawEvents]);
  const telemetry = useMemo(() => rawTelemetry ?? [], [rawTelemetry]);
  const totalEvents = events.length;

  const {
    position,
    isPlaying,
    speed,
    setPosition,
    setPlaying,
    setSpeed,
  } = useReplayStore();

  const [inspectedStage, setInspectedStage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance playback
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isPlaying && totalEvents > 0) {
      intervalRef.current = setInterval(() => {
        setPosition((position + 1) % totalEvents);
      }, Math.max(200, 1000 / speed));
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, totalEvents, position, setPosition]);

  const currentEvent = events[position] ?? null;
  const prevPositionRef = useRef(position);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Anime.js timeline scrub animation
  useEffect(() => {
    if (position !== prevPositionRef.current && timelineRef.current) {
      const dots = timelineRef.current.querySelectorAll(".timeline-dot");
      anime.animate(dots[position] as HTMLElement, {
        scale: [1, 1.4, 1],
        duration: 300,
        easing: "easeOutQuad",
      });
      if (prevPositionRef.current >= 0 && prevPositionRef.current < dots.length) {
        anime.animate(dots[prevPositionRef.current] as HTMLElement, {
          scale: [1.4, 1],
          duration: 200,
          easing: "easeOutQuad",
        });
      }
      prevPositionRef.current = position;
    }
  }, [position]);

  const telemetryForStage = useMemo(() => {
    if (!inspectedStage) return [];
    return telemetry.filter((t) => t.stage === inspectedStage);
  }, [telemetry, inspectedStage]);

  const uniqueStages = useMemo(() => {
    const seen = new Set<string>();
    return events.filter((e) => {
      if (seen.has(e.stage)) return false;
      seen.add(e.stage);
      return true;
    });
  }, [events]);

  const handleRestart = useCallback(() => {
    setPosition(0);
    setPlaying(false);
    setInspectedStage(null);
  }, [setPosition, setPlaying]);

  const handleStepForward = useCallback(() => {
    if (totalEvents > 0) {
      setPosition(Math.min(position + 1, totalEvents - 1));
      setPlaying(false);
    }
  }, [position, totalEvents, setPosition, setPlaying]);

  const handleStepBack = useCallback(() => {
    if (totalEvents > 0) {
      setPosition(Math.max(position - 1, 0));
      setPlaying(false);
    }
  }, [position, totalEvents, setPosition, setPlaying]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Execution Replay</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step through execution events with timeline controls
          {objectiveId && (
            <span className="ml-2 font-mono text-[11px] text-muted-foreground/60">
              ID: {objectiveId.slice(0, 8)}&hellip;
            </span>
          )}
        </p>
      </motion.div>

      {totalEvents === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No events available for replay. Run an objective first.
          </p>
        </motion.div>
      )}

      {totalEvents > 0 && (
        <>
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-4 py-3"
          >
            <div className="flex items-center gap-1.5">
              <ControlButton onClick={handleRestart} icon={RotateCcw} label="Restart" />
              <ControlButton onClick={handleStepBack} icon={ChevronLeft} label="Step Back" disabled={position <= 0} />
              <button
                onClick={() => setPlaying(!isPlaying)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-all",
                  isPlaying
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    : "bg-primary/15 text-primary hover:bg-primary/25",
                )}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
              <ControlButton onClick={handleStepForward} icon={ChevronRight} label="Step Forward" disabled={position >= totalEvents - 1} />
              <ControlButton onClick={() => setPosition(totalEvents - 1)} icon={SkipForward} label="Skip to End" />
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {position + 1} / {totalEvents}
              </span>
              <div className="flex items-center gap-1">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                      speed === s
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Timeline scrubber */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-border/50 bg-card p-4"
          >
            <div className="relative mb-2 flex items-center gap-1" ref={timelineRef}>
              {events.map((ev, i) => {
                const isActive = i === position;
                const isPast = i < position;
                const color =
                  ev.status === "completed"
                    ? "bg-emerald-500"
                    : ev.status === "error"
                      ? "bg-red-500"
                      : ev.status === "started"
                        ? "bg-blue-400"
                        : "bg-muted-foreground/30";
                return (
                  <button
                    key={i}
                    onClick={() => setPosition(i)}
                    className={cn(
                      "timeline-dot h-2 flex-1 rounded-full transition-all cursor-pointer",
                      color,
                      isActive && "h-3 scale-y-110",
                      isPast && "opacity-80",
                    )}
                    title={`${ev.stage}: ${ev.status}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
              <span>Start</span>
              <span>{currentEvent?.stage} &mdash; {currentEvent?.status}</span>
              <span>End</span>
            </div>
          </motion.div>

          {/* Current event detail */}
          {currentEvent && (
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-lg border border-border/50 bg-card"
            >
              <div className="flex items-center justify-between border-b border-border/30 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">
                    {stageDisplayNames[currentEvent.stage] ?? currentEvent.stage}
                  </h3>
                  <StatusBadge status={currentEvent.status} size="sm" />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Event #{currentEvent.event_order}
                </span>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentEvent.message ?? "No message"}
                </p>
                {currentEvent.created_at && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />
                    {new Date(currentEvent.created_at).toLocaleString()}
                  </div>
                )}
                {currentEvent.progress > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 max-w-[200px] overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${currentEvent.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {Math.round(currentEvent.progress)}%
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Stage Telemetry Tiles */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            ref={(el) => {
              if (el && uniqueStages.length > 0) {
                const tiles = el.querySelectorAll(".stage-tile");
                anime.animate(tiles as unknown as HTMLElement, {
                  opacity: [0, 1],
                  translateY: [12, 0],
                  scale: [0.96, 1],
                  delay: anime.stagger(40, { from: "center" }),
                  duration: 400,
                  easing: "easeOutCubic",
                });
              }
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Agent Telemetry by Stage</h3>
              {summary && (
                <span className="text-[11px] text-muted-foreground">
                  {summary.total_agents} agents &middot; ${summary.total_cost.toFixed(6)} &middot; {summary.total_tokens} tokens
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uniqueStages.map((stageEv) => {
                const stageTelemetry = telemetry.filter(
                  (t) => t.stage === stageEv.stage,
                );
                const completed = stageTelemetry.filter(
                  (t) => t.status === "completed",
                ).length;
                const failed = stageTelemetry.filter(
                  (t) => t.status === "failed",
                ).length;
                const totalTokens = stageTelemetry.reduce(
                  (sum, t) => sum + (t.total_tokens ?? 0),
                  0,
                );
                const totalCost = stageTelemetry.reduce(
                  (sum, t) => sum + (t.total_cost ?? 0),
                  0,
                );
                const isInspected = inspectedStage === stageEv.stage;

                return (
                  <button
                    key={stageEv.stage}
                    onClick={() =>
                      setInspectedStage(
                        isInspected ? null : stageEv.stage,
                      )
                    }
                    className={cn(
                      "stage-tile rounded-lg border border-border/50 bg-card p-4 text-left transition-all hover:border-border",
                      isInspected && "ring-1 ring-primary/40",
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">
                        {stageDisplayNames[stageEv.stage] ?? stageEv.stage}
                      </span>
                      <StatusBadge status={stageEv.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{stageTelemetry.length} agents</span>
                      {completed > 0 && (
                        <span className="text-emerald-400">{completed} ok</span>
                      )}
                      {failed > 0 && (
                        <span className="text-red-400">{failed} fail</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        {totalTokens.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${totalCost.toFixed(6)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Inspected stage detail */}
          {inspectedStage && telemetryForStage.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-lg border border-border/50 bg-card"
            >
              <div className="border-b border-border/30 px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {stageDisplayNames[inspectedStage] ?? inspectedStage}
                </h3>
                <button
                  onClick={() => setInspectedStage(null)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              <div className="divide-y divide-border/20">
                {telemetryForStage.map((t) => (
                  <div key={t.id} className="px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {t.agent_name ?? t.agent_id}
                        </span>
                        <StatusBadge status={t.status} size="sm" />
                      </div>
                      {t.runtime_ms != null && (
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {(t.runtime_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <DetailChip
                        icon={Cpu}
                        label="Tokens"
                        value={t.total_tokens?.toLocaleString() ?? "—"}
                      />
                      <DetailChip
                        icon={DollarSign}
                        label="Cost"
                        value={
                          t.total_cost != null
                            ? `$${t.total_cost.toFixed(6)}`
                            : "—"
                        }
                      />
                      <DetailChip
                        icon={Activity}
                        label="Confidence"
                        value={
                          t.confidence != null
                            ? `${(t.confidence * 100).toFixed(0)}%`
                            : "—"
                        }
                      />
                      <DetailChip
                        icon={AlertTriangle}
                        label="Retries"
                        value={String(t.retries)}
                      />
                    </div>

                    {t.model && (
                      <div className="text-[11px] text-muted-foreground/60">
                        Model: {t.provider && `${t.provider}/`}
                        {t.model}
                      </div>
                    )}

                    {t.error && (
                      <div className="rounded-md bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
                        Error: {t.error}
                      </div>
                    )}

                    {t.reasoning_summary && (
                      <div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Reasoning
                        </span>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          {t.reasoning_summary}
                        </p>
                      </div>
                    )}

                    {t.decision_summary && (
                      <div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Decision
                        </span>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          {t.decision_summary}
                        </p>
                      </div>
                    )}

                    {t.tool_calls && t.tool_calls.length > 0 && (
                      <div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Tool Calls
                        </span>
                        <div className="mt-1 space-y-1">
                          {t.tool_calls.map((tc, j) => (
                            <div
                              key={j}
                              className="rounded bg-muted/30 px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground"
                            >
                              {JSON.stringify(tc).slice(0, 200)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

function ControlButton({
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  onClick: () => void;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-all",
        disabled
          ? "text-muted-foreground/30 cursor-not-allowed"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
      )}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function DetailChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/30 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <span className="font-mono text-xs font-medium tabular-nums text-foreground/80">
        {value}
      </span>
    </div>
  );
}
