"use client";

import { motion } from "motion/react";
import { useObjectiveContextStore } from "@/store";
import { useLatestObjectiveIdQuery, useDashboardQuery } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";
import { EmptyState } from "./empty-state";

interface ScoreItem {
  label: string;
  value: number | null;
  max?: number;
  invert?: boolean;
}

function ScoreBar({ item, delay }: { item: ScoreItem; delay: number }) {
  const { value, max = 100, invert = false } = item;
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  const normalized = invert ? 100 - pct : pct;
  const color =
    normalized >= 75
      ? "bg-success"
      : normalized >= 45
        ? "bg-warning"
        : "bg-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-lg border border-border/20 bg-background/30 px-3 py-2.5 transition-colors hover:border-border/40"
    >
      <div className="pointer-events-none absolute -right-4 -top-6 h-12 w-12 rounded-full bg-primary/10 blur-xl transition-opacity opacity-0 group-hover:opacity-100" />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
          {item.label}
        </span>
        <span
          className={cn(
            "font-mono text-xs font-semibold tabular-nums",
            normalized >= 75
              ? "text-success"
              : normalized >= 45
                ? "text-warning"
                : "text-destructive"
          )}
        >
          {value != null ? `${Math.round(pct)}${max !== 100 ? `/${max}` : "%"}` : "\u2014"}
        </span>
      </div>
      <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: delay + 0.15, ease: [0.16, 1, 0.3, 1] }}
          className={cn("relative h-full rounded-full", color)}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export function SystemScores() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: dashboard } = useDashboardQuery(objectiveId);

  const sh = dashboard?.system_health;
  const plan = dashboard?.plan;
  const hasData = sh != null && Object.values(sh).some((v) => v != null);

  const scores: ScoreItem[] = [
    { label: "Execution Score", value: sh?.execution_score != null ? sh.execution_score * 100 : null },
    { label: "Coordination", value: sh?.coordination_score != null ? sh.coordination_score * 100 : null },
    { label: "Trust Score", value: sh?.trust_score != null ? sh.trust_score * 100 : null },
    { label: "Decision Quality", value: sh?.decision_quality != null ? sh.decision_quality * 100 : null },
    { label: "Readiness", value: sh?.business_readiness_score != null ? sh.business_readiness_score * 100 : null },
    { label: "Success Probability", value: sh?.success_probability_score != null ? sh.success_probability_score * 100 : null },
    { label: "Risk Index", value: sh?.risk_index != null ? sh.risk_index * 100 : null, invert: true },
    {
      label: "Plan Milestones",
      value: plan?.milestone_count ? (plan.completed_milestones ?? 0) : null,
      max: plan?.milestone_count ?? 100,
    },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Gauge className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">System Scores</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/40">live objective</span>
      </div>
      <div className="panel-body">
        {!hasData ? (
          <EmptyState
            icon={<Gauge className="h-4 w-4" />}
            title="No scores computed yet"
            description="Health, risk and quality scores appear here once a pipeline finishes analyzing an objective."
            hint="execution · coordination · trust"
            className="h-[210px]"
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {scores.map((s, i) => (
              <ScoreBar key={s.label} item={s} delay={0.05 + i * 0.04} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
