"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { ArrowRight, Zap, Play, Activity, Clock, Users, Building2, BarChart3, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { PulseRing } from "@/components/premium/page-transition";
import { useSSEStore } from "@/store/sse-store";
import { useObjectiveContextStore } from "@/store";
import {
  useLatestObjectiveIdQuery,
  useDashboardQuery,
} from "@/hooks/use-api";

const STAGE_ORDER = [
  "awaiting_compilation", "compilation_complete",
  "planning_in_progress", "planning_complete",
  "organization_in_progress", "organization_complete",
  "risk_analysis_in_progress", "risk_analysis_complete",
  "awaiting_human_approval", "approved",
  "executing", "monitoring", "completed",
];

const PHASES = [
  { label: "Compile", atOrAfter: "compilation_complete" },
  { label: "Plan", atOrAfter: "planning_complete" },
  { label: "Organize", atOrAfter: "organization_complete" },
  { label: "Execute", atOrAfter: "risk_analysis_complete" },
  { label: "Review", atOrAfter: "completed" },
];

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function PhaseNode({ label, done, active, index, total }: { label: string; done: boolean; active: boolean; index: number; total: number }) {
  return (
    <div className="flex flex-1 items-center">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 + index * 0.05 }}
        className={`relative flex h-9 items-center justify-center rounded-full px-4 text-[10px] font-medium tracking-wide transition-all duration-500 ${
          active
            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-[0_0_20px_-2px_hsla(var(--primary)/0.2)]"
            : done
              ? "bg-gradient-to-r from-success/15 to-success/5 text-success/80 border border-success/20"
              : "bg-muted/15 text-muted-foreground/40 border border-border/15"
        }`}
      >
        {done && !active ? (
          <CheckCircle2 className="mr-1.5 h-3 w-3 text-success/60" />
        ) : active ? (
          <Circle className="mr-1.5 h-3 w-3 text-primary animate-pulse" />
        ) : (
          <Circle className="mr-1.5 h-3 w-3 text-muted-foreground/20" />
        )}
        {label}
        {active && (
          <motion.span
            className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>
      {index < total - 1 && (
        <div className="relative mx-1 flex-1">
          <motion.div
            className={`h-px ${done && !active ? "bg-gradient-to-r from-success/40 to-success/20" : active ? "bg-gradient-to-r from-primary/40 to-primary/10" : "bg-border/10"}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
            style={{ transformOrigin: "left" }}
          />
          {active && (
            <motion.div
              className="absolute inset-0 h-px bg-gradient-to-r from-primary/60 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = "text-foreground/80", bg = "bg-muted/10", hue = "primary" }: { icon: typeof Activity; label: string; value: string; color?: string; bg?: string; hue?: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`relative overflow-hidden rounded-xl border border-border/15 ${bg} px-4 py-3 transition-all duration-200 hover:border-border/30 hover:shadow-[0_0_25px_-8px_hsl(var(--${hue})/0.12)]`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-3 w-3 ${color} opacity-60`} />
        <div className="section-kicker text-muted-foreground/50">{label}</div>
      </div>
      <div className={`font-mono text-lg font-bold tracking-tight ${color}`}>
        {value}
      </div>
      <motion.div
        className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full border-2 border-current opacity-[0.15]"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

function RunningState({ dashboard }: { dashboard: NonNullable<ReturnType<typeof useDashboardQuery>["data"]> }) {
  const obj = dashboard.objective!;
  const stageIndex = STAGE_ORDER.indexOf(obj.current_stage ?? "");
  const phases = PHASES.map((p) => {
    const idx = STAGE_ORDER.indexOf(p.atOrAfter);
    return { label: p.label, done: stageIndex >= idx && stageIndex >= 0 };
  });
  const activePhaseIdx = phases.findIndex((p) => !p.done);
  const progress = dashboard.objective?.progress_percent ?? 0;
  const deptCount = dashboard.organization?.departments?.length ?? 0;
  const headCount = dashboard.organization?.total_head_count ?? 0;
  const confidence = dashboard.objective?.confidence ?? 0;

  return (
    <div className="panel relative overflow-hidden">
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: [
            "radial-gradient(600px circle at 20% 50%, hsla(var(--primary)/0.08), transparent 50%)",
            "radial-gradient(600px circle at 80% 50%, hsla(var(--primary)/0.08), transparent 50%)",
            "radial-gradient(600px circle at 20% 50%, hsla(var(--primary)/0.08), transparent 50%)",
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="panel-body relative z-[1]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <motion.div
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15"
                animate={{ boxShadow: ["0 0 0px hsla(var(--primary)/0)", "0 0 20px hsla(var(--primary)/0.25)", "0 0 0px hsla(var(--primary)/0)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Play className="h-4 w-4 text-primary" />
              </motion.div>
              <h2 className="text-sm font-semibold">Live Execution</h2>
              <HealthBadge status="running" size="sm" />
            </div>
            <p className="mt-3 text-base font-medium leading-snug text-foreground/90">
              {obj.summary?.split("\n")[0]?.slice(0, 80) ?? obj.id}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/50">
              Stage: {obj.current_stage ?? "\u2014"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PulseRing active color="hsl(var(--primary))" size={12} />
            <Link
              href={`/execution?id=${obj.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/50 px-4 py-2.5 text-xs font-medium text-secondary-foreground/70 transition-all hover:bg-muted/30 hover:text-foreground active:scale-[0.97]"
            >
              Open Live View
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground/50">
            <span>Pipeline Progress</span>
            <motion.span className="font-mono tabular-nums font-semibold" key={Math.round(progress)}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              {Math.round(progress)}%
            </motion.span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/60"
              style={{ boxShadow: "0 0 14px hsla(var(--primary)/0.35)" }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-0">
          {phases.map((phase, i) => (
            <PhaseNode key={phase.label} label={phase.label} done={phase.done} active={i === activePhaseIdx} index={i} total={phases.length} />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={BarChart3} label="Current Stage" value={obj.current_stage ?? "\u2014"} color="text-primary" bg="bg-primary/5" hue="primary" />
          <StatCard icon={Building2} label="Departments" value={String(dashboard.organization?.departments?.length ?? "\u2014")} color="text-violet-400" bg="bg-violet-500/5" hue="primary" />
          <StatCard icon={Users} label="Head Count" value={String(dashboard.organization?.total_head_count ?? "\u2014")} color="text-emerald-400" bg="bg-emerald-500/5" hue="primary" />
          <StatCard icon={Activity} label="Status" value={obj.status ?? "\u2014"} color="text-amber-400" bg="bg-amber-500/5" hue="primary" />
        </div>
        <div className="mt-4">
          <ConfidenceBar value={confidence} label="Current Confidence" size="md" />
        </div>
      </div>
    </div>
  );
}

function LastRunState({ dashboard }: { dashboard: NonNullable<ReturnType<typeof useDashboardQuery>["data"]> }) {
  const obj = dashboard.objective!;
  const lastRunDuration = obj.created_at
    ? Math.round(((Date.now() - new Date(obj.created_at).getTime()) / 1000))
    : 0;
  const statusMap: Record<string, "completed" | "failed" | "idle"> = {
    completed: "completed", failed: "failed", draft: "idle",
  };
  const st = obj.status ?? "";
  const confidence = obj.confidence ?? 0;

  return (
    <div className="panel relative overflow-hidden">
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/5"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full border border-violet-500/5"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />
      <div className="panel-body relative">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
              <Activity className="h-5 w-5 text-primary" />
              <motion.div
                className="pointer-events-none absolute -inset-1 rounded-xl border border-primary/20"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold">Executive Summary</h2>
                <HealthBadge status={statusMap[st] ?? "idle"} size="sm" />
              </div>
              <p className="mt-2 text-base font-medium leading-snug text-foreground/90">
                {obj.summary?.split("\n")[0]?.slice(0, 80) ?? obj.id}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/50">{obj.current_stage ?? "completed"}</p>
            </div>
          </div>
          <Link href={`/execution?id=${obj.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-gradient-to-br from-secondary/60 to-secondary/30 px-4 py-2.5 text-xs font-medium text-secondary-foreground/70 transition-all hover:bg-muted/30 hover:text-foreground hover:border-border/50 active:scale-[0.97] group"
          >
            View Details
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-500/8 to-transparent border border-sky-500/15 px-4 py-3.5 transition-all duration-200 hover:border-sky-500/25 hover:shadow-[0_0_25px_-8px_hsl(var(--primary)/0.1)]"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3 w-3 text-sky-400" />
              <div className="section-kicker text-sky-400/60">Duration</div>
            </div>
            <div className="font-mono text-lg font-bold text-sky-400">{`${(lastRunDuration / 60).toFixed(1)}m`}</div>
            <motion.div className="pointer-events-none absolute -right-4 -top-4 h-10 w-10 rounded-full border border-sky-400/10" animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/8 to-transparent border border-violet-500/15 px-4 py-3.5 transition-all duration-200 hover:border-violet-500/25 hover:shadow-[0_0_25px_-8px_hsl(var(--primary)/0.1)]"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Building2 className="h-3 w-3 text-violet-400" />
              <div className="section-kicker text-violet-400/60">Departments</div>
            </div>
            <div className="font-mono text-lg font-bold text-violet-400">{String(dashboard.organization?.departments?.length ?? "\u2014")}</div>
            <motion.div className="pointer-events-none absolute -right-4 -top-4 h-10 w-10 rounded-full border border-violet-400/10" animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/8 to-transparent border border-emerald-500/15 px-4 py-3.5 transition-all duration-200 hover:border-emerald-500/25 hover:shadow-[0_0_25px_-8px_hsl(var(--primary)/0.1)]"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="h-3 w-3 text-emerald-400" />
              <div className="section-kicker text-emerald-400/60">Head Count</div>
            </div>
            <div className="font-mono text-lg font-bold text-emerald-400">{String(dashboard.organization?.total_head_count ?? "\u2014")}</div>
            <motion.div className="pointer-events-none absolute -right-4 -top-4 h-10 w-10 rounded-full border border-emerald-400/10" animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            className={`relative overflow-hidden rounded-xl px-4 py-3.5 border transition-all duration-200 hover:shadow-[0_0_25px_-8px_hsl(var(--primary)/0.1)] ${
              confidence > 0.7
                ? "bg-gradient-to-br from-success/8 to-transparent border-success/15 hover:border-success/25"
                : "bg-gradient-to-br from-warning/8 to-transparent border-warning/15 hover:border-warning/25"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <BarChart3 className={`h-3 w-3 ${confidence > 0.7 ? "text-success" : "text-warning"}`} />
              <div className={`section-kicker ${confidence > 0.7 ? "text-success/60" : "text-warning/60"}`}>Confidence</div>
            </div>
            <div className={`font-mono text-lg font-bold ${confidence > 0.7 ? "text-success" : "text-warning"}`}>
              {obj.confidence != null ? `${Math.round(obj.confidence * 100)}%` : "\u2014"}
            </div>
            <motion.div className="pointer-events-none absolute -right-4 -top-4 h-10 w-10 rounded-full border border-current opacity-20" animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
          </motion.div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-lg bg-gradient-to-r from-muted/15 to-muted/5 px-4 py-3 border border-border/10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-[10px] font-medium text-success shadow-[0_0_8px_-2px_hsl(var(--success)/0.15)]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Compiled
            </span>
            <motion.svg className="h-3 w-3 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <motion.path d="M5 12h14" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
              <motion.path d="M12 5l7 7-7 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 }} />
            </motion.svg>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-[10px] font-medium text-success shadow-[0_0_8px_-2px_hsl(var(--success)/0.15)]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Planned
            </span>
            <motion.svg className="h-3 w-3 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </motion.svg>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-[10px] font-medium text-success shadow-[0_0_8px_-2px_hsl(var(--success)/0.15)]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Organized
            </span>
            <motion.svg className="h-3 w-3 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </motion.svg>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-[10px] font-medium text-success shadow-[0_0_8px_-2px_hsl(var(--success)/0.15)]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Executed
            </span>
          </div>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground/30">{dashboard.plan?.milestone_count ?? 0} milestones</span>
        </div>
      </div>
    </div>
  );
}

export function ActiveExecution() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: dashboard } = useDashboardQuery(objectiveId);
  const ssePipelineStatus = useSSEStore((s) => s.pipelineStatus);

  const obj = dashboard?.objective;
  const sseDone = ssePipelineStatus === "completed" || ssePipelineStatus === "completed_with_errors" || ssePipelineStatus === "error";
  const objDone = !!obj && TERMINAL_STATUSES.has(obj.status ?? "");
  const isActive = !!obj && !sseDone && !objDone;

  if (!obj) {
    return (
      <div className="panel relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/3 via-transparent to-transparent pointer-events-none" />
        <motion.div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full border border-border/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        <div className="panel-body relative">
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="relative mb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20">
                <Zap className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <motion.div
                className="pointer-events-none absolute -inset-2 rounded-2xl border border-border/10"
                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <h3 className="text-base font-semibold text-foreground/70">No Pipeline Runs Yet</h3>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground/50 leading-relaxed">
              Execute a New Run from the Command Center above to see live pipeline status and results here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isActive) return <RunningState dashboard={dashboard!} />;
  return <LastRunState dashboard={dashboard!} />;
}
