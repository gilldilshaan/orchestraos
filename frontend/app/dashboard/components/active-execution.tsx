"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { NewRunModal } from "@/components/new-run-modal";
import { ArrowRight, Zap, Play } from "lucide-react";
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

const RISK_TONE: Record<string, string> = {
  low: "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
  medium: "border-amber-500/20 bg-amber-500/8 text-amber-400",
  high: "border-red-500/20 bg-red-500/8 text-red-400",
  critical: "border-red-500/30 bg-red-500/15 text-red-400",
};

export function ActiveExecution() {
  const [showNewRun, setShowNewRun] = useState(false);
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
  const currentExecutive = dashboard?.organization?.departments?.[0]?.name ?? "\u2014";
  const activeSpecialists = headCount - deptCount;
  const confidence = objective?.status ? (dashboard?.objective?.confidence ?? 0) : 0;

  if (!objective || !isActive) {
    const hasAnyRun = !!objective;
    const isCompleted = objective?.status === "completed";
    const recapConfidence = dashboard?.objective?.confidence ?? objective?.confidence ?? null;
    const recapProgress = dashboard?.objective?.progress_percent ?? 0;
    const recapDepts = dashboard?.organization?.departments?.length ?? 0;
    const recapHead = dashboard?.organization?.total_head_count ?? 0;
    const recapRuntime = objective?.created_at
      ? Math.max(
          0,
          ((objective.updated_at ? new Date(objective.updated_at).getTime() : Date.now()) -
            new Date(objective.created_at).getTime()) /
            1000
        )
      : 0;
    const fmtRuntime =
      recapRuntime >= 60
        ? `${(recapRuntime / 60).toFixed(1)}m`
        : `${recapRuntime.toFixed(1)}s`;
    const milestoneTotal = dashboard?.plan?.milestone_count ?? 0;
    const milestoneDone = dashboard?.plan?.completed_milestones ?? 0;
    const topRisks = dashboard?.risks?.top_risks ?? [];
    const pendingDecisions = dashboard?.decisions?.pending_decisions ?? [];
    const milestoneTicks = Array.from({ length: Math.min(milestoneTotal, 14) }, (_, i) => i < milestoneDone);

    return (
      <div className="panel flex h-full flex-col">
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <div className="panel-body flex flex-1 flex-col">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/30">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
                <h2 className="text-sm font-semibold text-foreground/80">
                  {hasAnyRun ? "Latest Execution" : "Active Execution"}
                </h2>
                {hasAnyRun && (
                  <HealthBadge status={objective.status as "completed" | "failed" | "running"} size="sm" />
                )}
              </div>
              {hasAnyRun && (
                <p className="mt-3 max-w-[480px] text-sm font-medium leading-snug text-foreground/80 line-clamp-2">
                  {objective.raw_input.split("\n")[0]}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground/50">
                {hasAnyRun
                  ? `Finished ${objective.status === "completed" ? "successfully" : `with status "${objective.status}"`} ┬╖ no active run right now`
                  : "No runs yet. Start a new run to see live execution."}
              </p>
            </div>
            <Link
              href={`/execution?id=${objective?.id ?? ""}`}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/50 px-3.5 py-2 text-xs font-medium text-secondary-foreground/70 transition-all hover:bg-muted/30 hover:text-foreground active:scale-[0.97] ${hasAnyRun ? "" : "pointer-events-none opacity-0"}`}
            >
              Open Results
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {hasAnyRun ? (
            <>
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground/50">
                  <span>Completion</span>
                  <motion.span
                    className="font-mono tabular-nums"
                    key={Math.round(recapProgress)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {Math.round(recapProgress)}%
                  </motion.span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(recapProgress, 100)}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative h-full rounded-full ${
                      isCompleted
                        ? "bg-gradient-to-r from-success/70 via-success to-success/50"
                        : "bg-gradient-to-r from-warning/60 via-warning to-warning/40"
                    }`}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                        backgroundSize: "200% 100%",
                      }}
                      animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Status", value: objective.status },
                  {
                    label: "Confidence",
                    value: recapConfidence != null ? `${Math.round(recapConfidence * 100)}%` : "\u2014",
                  },
                  {
                    label: "Departments",
                    value: recapDepts > 0 ? String(recapDepts) : "\u2014",
                  },
                  {
                    label: "Head Count",
                    value: recapHead > 0 ? String(recapHead) : "\u2014",
                  },
                  {
                    label: "Runtime",
                    value: recapRuntime > 0 ? fmtRuntime : "\u2014",
                  },
                  {
                    label: "Milestones",
                    value:
                      dashboard?.plan?.completed_milestones != null
                        ? `${dashboard.plan.completed_milestones}/${dashboard.plan.milestone_count ?? 0}`
                        : "\u2014",
                  },
                  {
                    label: "Risks",
                    value: dashboard?.risks?.total != null ? String(dashboard.risks.total) : "\u2014",
                  },
                  {
                    label: "Decisions",
                    value:
                      dashboard?.decisions?.pending_decisions != null
                        ? String(dashboard.decisions.pending_decisions.length)
                        : "\u2014",
                  },
                ].map((d) => (
                  <div key={d.label} className="rounded-lg border border-border/15 bg-background/20 px-3 py-2.5">
                    <div className="section-kicker">{d.label}</div>
                    <div className="mt-0.5 truncate font-mono text-sm font-medium text-foreground/80">
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border/15 bg-background/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="section-kicker">Milestones</span>
                    <span className="font-mono text-[11px] tabular-nums text-foreground/60">
                      {milestoneTotal > 0 ? `${milestoneDone}/${milestoneTotal}` : "\u2014"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    {milestoneTotal > 0 ? (
                      milestoneTicks.map((done, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scaleX: 0 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ delay: 0.2 + i * 0.02 }}
                          className={`h-1.5 flex-1 rounded-full ${
                            done
                              ? "bg-gradient-to-r from-success/70 via-success to-success/50"
                              : "bg-muted/30"
                          }`}
                        />
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground/40">No milestone data</span>
                    )}
                  </div>
                  <p className="mt-2.5 text-[10px] text-muted-foreground/40">
                    {milestoneTotal > 0
                      ? milestoneDone >= milestoneTotal
                        ? "All milestones completed"
                        : `${milestoneDone} of ${milestoneTotal} milestones reached`
                      : "Milestones appear once the plan is compiled"}
                  </p>
                </div>

                <div className="rounded-xl border border-border/15 bg-background/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="section-kicker">Top Risks</span>
                    <span className="font-mono text-[11px] tabular-nums text-foreground/60">
                      {dashboard?.risks?.total != null ? String(dashboard.risks.total) : "\u2014"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {topRisks.length > 0 ? (
                      topRisks.slice(0, 4).map((r) => (
                        <span
                          key={r.id}
                          className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${RISK_TONE[r.risk_level] ?? "border-border/20 bg-muted/20 text-muted-foreground/60"}`}
                          title={r.title}
                        >
                          <span className="truncate">{r.title}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground/40">No risks identified</span>
                    )}
                  </div>
                  {topRisks.length === 0 && (
                    <p className="mt-2.5 text-[10px] text-muted-foreground/40">
                      Risk analysis runs before execution begins
                    </p>
                  )}
                </div>
              </div>

              {pendingDecisions.length > 0 && (
                <div className="mt-4 rounded-xl border border-border/15 bg-background/20 p-4">
                  <div className="section-kicker">Pending Decisions</div>
                  <div className="mt-3 space-y-2.5">
                    {pendingDecisions.slice(0, 3).map((d) => (
                      <div key={d.id} className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground/70">
                          {d.title}
                        </span>
                        <ConfidenceBar value={d.confidence} size="sm" className="w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-center gap-3 pt-6">
                <motion.button
                  onClick={() => setShowNewRun(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Play className="h-3.5 w-3.5" />
                  Start New Run
                </motion.button>
                <Link
                  href="/runs"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground/60"
                >
                  View all runs
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </>
          ) : (
            <div className="my-auto flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/20 py-14 text-center">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary/60"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Play className="h-4 w-4" />
              </motion.div>
              <p className="mt-3 text-xs font-medium text-foreground/60">No runs yet</p>
              <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-muted-foreground/45">
                Launch a pipeline to watch compilation, planning, organization and risk analysis execute live.
              </p>
            </div>
          )}
        </div>
        <NewRunModal open={showNewRun} onClose={() => setShowNewRun(false)} />
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="panel-body">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                <Play className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-sm font-semibold">Active Execution</h2>
              <HealthBadge status="running" size="sm" />
            </div>
            <p className="mt-3 text-base font-medium leading-snug text-foreground/90">
              {objective.raw_input.split("\n")[0].slice(0, 80)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/50">
              Stage: {objective.current_stage ?? "\u2014"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PulseRing active color="hsl(var(--primary))" size={10} />
            <Link
              href={`/execution?id=${objective.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/50 px-3.5 py-2 text-xs font-medium text-secondary-foreground/70 transition-all hover:bg-muted/30 hover:text-foreground active:scale-[0.97]"
            >
              Open Live View
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground/50">
            <span>Progress</span>
            <motion.span
              className="font-mono tabular-nums"
              key={Math.round(progress)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Math.round(progress)}%
            </motion.span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/40"
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1">
          {phases.map((phase, i) => (
            <div key={phase.label} className="flex flex-1 items-center">
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
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
                    {"\u2713"}
                  </motion.span>
                )}
              </motion.div>
              {i < phases.length - 1 && (
                <div className="mx-1 h-px flex-1 bg-border/20" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Current Stage", value: objective.current_stage ?? "\u2014" },
            { label: "Current Executive", value: currentExecutive },
            { label: "Active Specialists", value: String(activeSpecialists) },
            { label: "Status", value: objective.status },
          ].map((d) => (
            <div key={d.label}>
              <div className="section-kicker">{d.label}</div>
              <div className="mt-0.5 font-mono text-sm font-medium text-foreground/80">
                {d.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <ConfidenceBar value={confidence} label="Current Confidence" size="md" />
        </div>
      </div>
    </div>
  );
}
