"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { ArrowRight, Zap } from "lucide-react";
import { PulseRing } from "@/components/premium/page-transition";
import { useSSEStore } from "@/store/sse-store";
import { useObjectiveContextStore } from "@/store";
import {
  useLatestObjectiveIdQuery,
  useObjectiveQuery,
  useDashboardQuery,
} from "@/hooks/use-api";

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

const PHASES = [
  { label: "Compile", atOrAfter: "compilation_complete" },
  { label: "Plan", atOrAfter: "planning_complete" },
  { label: "Organize", atOrAfter: "organization_complete" },
  { label: "Execute", atOrAfter: "risk_analysis_complete" },
  { label: "Review", atOrAfter: "completed" },
];

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function ActiveExecution() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: objective } = useObjectiveQuery(objectiveId);
  const { data: dashboard } = useDashboardQuery(objectiveId);
  const ssePipelineStatus = useSSEStore((s) => s.pipelineStatus);

  const sseDone = ssePipelineStatus === "completed" || ssePipelineStatus === "completed_with_errors" || ssePipelineStatus === "error";
  const objDone = !!objective && TERMINAL_STATUSES.has(objective.status);
  const isActive = !sseDone && !objDone && !!objective;
  const stageIndex = STAGE_ORDER.indexOf(objective?.current_stage ?? "");

  const phases = PHASES.map((p) => {
    const atOrAfterIndex = STAGE_ORDER.indexOf(p.atOrAfter);
    return { label: p.label, done: stageIndex >= atOrAfterIndex && stageIndex >= 0 };
  });
  const activePhaseIdx = phases.findIndex((p) => !p.done);

  const progress = dashboard?.objective?.progress_percent ?? 0;
  const deptCount = dashboard?.organization?.departments?.length ?? 0;
  const headCount = dashboard?.organization?.total_head_count ?? 0;
  const currentExecutive = dashboard?.organization?.departments?.[0]?.name ?? "—";
  const activeSpecialists = headCount - deptCount;
  const confidence = objective?.status ? (dashboard?.objective?.confidence ?? 0) : 0;

  if (!objective || !isActive) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
        className="enterprise-panel p-6"
      >
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/20 border border-border/20">
              <Zap className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground/80">Active Execution</h2>
              <HealthBadge status="idle" size="sm" />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground/60 leading-relaxed">
            {objective
              ? `Most recent: "${objective.raw_input.slice(0, 60)}" (${objective.status})`
              : "No runs yet — start a New Run to see live execution here."}
          </p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className="enterprise-panel bg-gradient-to-br from-primary/[0.03] via-card/80 to-card/80 p-6"
    >
      {/* Top glow bar */}
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Active Execution</h2>
              <HealthBadge status="running" size="sm" />
            </div>
            <p className="mt-3 text-base font-medium leading-snug text-foreground/90">
              {objective.raw_input.split("\n")[0].slice(0, 80)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/50">
              Stage: {objective.current_stage ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PulseRing active color="hsl(var(--primary))" size={12} />
            <Link
              href={`/execution?id=${objective.id}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border/30 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-secondary-foreground/80 transition-all hover:bg-muted/30 hover:text-foreground active:scale-[0.98]"
            >
              Open Live View
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground/50">
            <span>Progress</span>
            <motion.span
              className="font-mono"
              key={Math.round(progress)}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {Math.round(progress)}%
            </motion.span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/60"
            >
              <motion.div
                className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>

        {/* Phase indicators */}
        <div className="mt-5 flex items-center gap-1">
          {phases.map((phase, i) => (
            <div key={phase.label} className="flex flex-1 items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.05 }}
                className={`flex h-7 items-center justify-center rounded-full px-3 text-[10px] font-medium transition-all duration-300 ${
                  i === activePhaseIdx
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : phase.done
                      ? "bg-primary/8 text-primary/60 border border-primary/10"
                      : "bg-muted/20 text-muted-foreground/40 border border-border/20"
                }`}
              >
                {phase.label}
                {i === activePhaseIdx && (
                  <motion.span
                    className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                {phase.done && i !== activePhaseIdx && (
                  <motion.span
                    className="ml-1.5 text-primary/40"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.div>
              {i < phases.length - 1 && (
                <motion.div
                  className="mx-1 h-px flex-1 bg-border/20"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                  style={{ transformOrigin: "left" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Details grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Current Stage", value: objective.current_stage ?? "—" },
            { label: "Current Executive", value: currentExecutive },
            { label: "Active Specialists", value: String(activeSpecialists) },
            { label: "Status", value: objective.status },
          ].map((d) => (
            <div key={d.label}>
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
                {d.label}
              </div>
              <div className="mt-0.5 font-mono text-sm font-medium text-foreground/80">
                {d.value}
              </div>
            </div>
          ))}
        </div>

        {/* Confidence */}
        <div className="mt-4">
          <ConfidenceBar value={confidence} label="Current Confidence" size="md" />
        </div>
      </div>
    </motion.section>
  );
}
