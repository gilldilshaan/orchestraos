"use client";

import { motion } from "motion/react";
import { ScoreRing } from "@/components/score-ring";
import { StatusBadge } from "@/components/status-badge";
import { useLatestObjectiveIdQuery, useDashboardQuery } from "@/hooks/use-api";
import { useAggregateMetrics, useSystemHealth } from "@/hooks/use-dashboard";
import { useObjectiveContextStore } from "@/store";
import { Activity, TrendingUp, ShieldAlert, Target, Sparkles } from "lucide-react";

const toPct = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100));

export function ExecutiveBand() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: dashboard } = useDashboardQuery(objectiveId);
  const { metrics } = useAggregateMetrics();
  const { health } = useSystemHealth();

  const sh = dashboard?.system_health;
  const signalValues = [
    sh?.execution_score,
    sh?.coordination_score,
    sh?.trust_score,
    sh?.decision_quality,
    sh?.business_readiness_score,
  ].filter((v): v is number => v != null && Number.isFinite(v));
  const composite =
    signalValues.length > 0
      ? Math.round((signalValues.reduce((a, b) => a + b, 0) / signalValues.length) * 100)
      : null;
  const risk = toPct(sh?.risk_index);
  const success = toPct(sh?.success_probability_score);
  const confidence =
    metrics.avgConfidence != null ? Math.round(metrics.avgConfidence * 100) : null;

  const objective = dashboard?.objective;

  const tiles = [
    {
      label: "Composite Health",
      value: composite,
      color: "hsl(158 62% 42%)",
      icon: Activity,
      sub: `${signalValues.length} signals`,
      hint: "execution · coordination · trust",
    },
    {
      label: "Avg. Confidence",
      value: confidence,
      color: "hsl(217 80% 58%)",
      icon: TrendingUp,
      sub: "decision quality",
      hint: "weighted model output",
    },
    {
      label: "Risk Index",
      value: risk,
      color: "hsl(0 72% 55%)",
      icon: ShieldAlert,
      sub:
        risk == null
          ? "\u2014"
          : risk >= 60
            ? "elevated"
            : risk >= 30
              ? "moderate"
              : "contained",
      hint: "probability × impact",
    },
    {
      label: "Success Probability",
      value: success,
      color: "hsl(38 88% 52%)",
      icon: Target,
      sub: "model projection",
      hint: "readiness-adjusted",
    },
  ] as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-2xl border border-border/30 bg-card/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/20 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="section-kicker">Executive Summary</span>
          {objective && (
            <>
              <span className="h-3 w-px bg-border/40" />
              <span className="truncate text-[11px] text-foreground/60">
                {objective.summary ?? objective.id ?? "Untitled objective"}
              </span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {objective && <StatusBadge status={objective.status ?? "idle"} size="sm" />}
          <span className="chip hidden sm:inline-flex">
            {health.active_runs} active · queue {health.queue_depth}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-border/10 lg:grid-cols-4 lg:divide-y-0">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-muted/10"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `linear-gradient(90deg, transparent, ${tile.color}55, transparent)` }}
            />
            <ScoreRing value={tile.value ?? 0} size={64} strokeWidth={5} color={tile.color} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <tile.icon className="h-3 w-3 shrink-0" style={{ color: tile.color }} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                  {tile.label}
                </span>
              </div>
              <div className="mt-1 truncate text-[11px] text-muted-foreground/40">
                {tile.value != null ? tile.sub : "awaiting pipeline"}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
