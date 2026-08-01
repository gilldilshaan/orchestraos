"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { useSSEStore } from "@/store/sse-store";
import { useObjectiveContextStore } from "@/store";
import { useLatestObjectiveIdQuery, useObjectiveQuery } from "@/hooks/use-api";
import {
  Orbit,
  FileText,
  Building2,
  Scale,
  Lightbulb,
  LayoutDashboard,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_ORDER = [
  "awaiting_compilation",
  "compilation_complete",
  "planning_in_progress",
  "planning_complete",
  "organization_in_progress",
  "organization_complete",
  "risk_analysis_in_progress",
  "risk_analysis_complete",
  "awaiting_human_approval",
  "approved",
  "executing",
  "monitoring",
  "completed",
];

const STAGES = [
  {
    key: "compile",
    label: "Compile",
    detail: "Objective compiler",
    icon: Orbit,
    color: "hsl(var(--primary))",
    atOrAfter: "compilation_complete",
  },
  {
    key: "plan",
    label: "Plan",
    detail: "Planner agent",
    icon: FileText,
    color: "hsl(190 91% 60%)",
    atOrAfter: "planning_complete",
  },
  {
    key: "organize",
    label: "Organize",
    detail: "Org designer",
    icon: Building2,
    color: "hsl(271 91% 65%)",
    atOrAfter: "organization_complete",
  },
  {
    key: "risk",
    label: "Risk",
    detail: "Risk analyst",
    icon: Scale,
    color: "hsl(var(--warning))",
    atOrAfter: "risk_analysis_complete",
  },
  {
    key: "decide",
    label: "Decide",
    detail: "Decision agent",
    icon: Lightbulb,
    color: "hsl(330 91% 60%)",
    atOrAfter: "approved",
  },
  {
    key: "report",
    label: "Report",
    detail: "Dashboard agent",
    icon: LayoutDashboard,
    color: "hsl(var(--success))",
    atOrAfter: "completed",
  },
];

function FlowConnector({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div className="relative mx-1 h-px flex-1 self-center overflow-hidden bg-border/15">
      {done && <div className="absolute inset-0 bg-success/40" />}
      {active && (
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ left: ["-33%", "100%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}

export function PipelineRail() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: objective } = useObjectiveQuery(objectiveId);
  const sseProgress = useSSEStore((s) => s.progress);
  const currentStage = useSSEStore((s) => s.currentStage);
  const pipelineStatus = useSSEStore((s) => s.pipelineStatus);

  const stageIndex = STAGE_ORDER.indexOf(objective?.current_stage ?? "");

  const { stages, activeIdx } = useMemo(() => {
    const list = STAGES.map((s) => {
      const idx = STAGE_ORDER.indexOf(s.atOrAfter);
      return {
        ...s,
        done: stageIndex >= idx && stageIndex >= 0,
      };
    });
    const active = list.findIndex((s) => !s.done);
    return { stages: list, activeIdx: active === -1 ? list.length - 1 : active };
  }, [stageIndex]);

  const running =
    pipelineStatus === "running" ||
    Boolean(objective && !["completed", "failed", "cancelled"].includes(objective.status ?? ""));
  const stageProgress =
    stageIndex >= 0 ? Math.round((stageIndex / (STAGE_ORDER.length - 1)) * 100) : 0;
  const progress = Math.max(sseProgress, stageProgress);

  return (
    <div className="panel">
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Orbit className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">Pipeline Orchestration</span>
          {running && (
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] tabular-nums text-muted-foreground/40 sm:inline">
            stage: {currentStage.replace(/_/g, " ")}
          </span>
          <span className="font-mono text-xs font-semibold tabular-nums text-primary">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <div className="panel-body">
        <div className="flex items-center">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isActive = i === activeIdx && running;
            const isDone = stage.done || (i < activeIdx && running);            return (
              <div key={stage.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300",
                      isDone
                        ? "border-success/20 bg-success/10 text-success"
                        : isActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/20 bg-muted/10 text-muted-foreground/30"
                    )}
                    animate={
                      isActive
                        ? { boxShadow: [
                            "0 0 0px rgba(59,130,246,0)",
                            "0 0 18px rgba(59,130,246,0.25)",
                            "0 0 0px rgba(59,130,246,0)",
                          ] }
                        : {}
                    }
                    transition={{ duration: 1.6, repeat: isActive ? Infinity : 0 }}
                  >
                    {isActive && (
                      <motion.span
                        className="absolute inset-0 rounded-xl border border-primary/40"
                        animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    {isDone ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                        <Check className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </motion.div>
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "text-[10px] font-semibold tracking-wide",
                        isDone ? "text-success/80" : isActive ? "text-primary" : "text-muted-foreground/35"
                      )}
                    >
                      {stage.label}
                    </span>
                    <span className="hidden text-[9px] text-muted-foreground/25 lg:inline">
                      {stage.detail}
                    </span>
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <FlowConnector active={isActive} done={isDone} />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="relative h-1 overflow-hidden rounded-full bg-muted/40">
            <motion.div
              className="relative h-full rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/60"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/35">
            <span>{objective ? (objective.compiled_summary ?? objective.raw_input.slice(0, 90)) : "No active objective"}</span>
            <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
