"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useHealthAiQuery } from "@/hooks/use-api";
import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { PulseRing } from "@/components/premium/page-transition";
import { ScoreRing } from "@/components/score-ring";
import { Activity } from "lucide-react";

interface GaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color?: "primary" | "success" | "warning" | "destructive";
}

function Gauge({ label, value, max = 100, unit = "", color = "primary" }: GaugeProps) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const safeMax = Number.isFinite(Number(max)) && Number(max) > 0 ? Number(max) : 100;
  const pct = Math.min((safeValue / safeMax) * 100, 100);
  const colorMap = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  };
  const barColor = colorMap[color];

  return (
    <div className="group rounded-lg border border-border/20 bg-background/30 px-3.5 py-2.5 transition-colors hover:border-border/40">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
          {label}
        </span>
        <span className="font-mono text-xs font-medium tabular-nums text-foreground/70">
          {safeValue}{unit}
        </span>
      </div>
      <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/30">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className={cn("relative h-full rounded-full", barColor)}
        />
      </div>
    </div>
  );
}

export function SystemHealth() {
  const { data: ai } = useHealthAiQuery();
  const { metrics } = useAggregateMetrics();

  const gauges = [
    { label: "Provider", value: ai?.status === "healthy" ? 100 : ai?.status === "degraded" ? 60 : 0, max: 100, color: ai?.status === "healthy" ? "success" as const : "warning" as const },
    { label: "Org Health", value: Math.round((metrics.healthScore ?? 0) * 100), max: 100, color: (metrics.healthScore ?? 0) > 0.8 ? "success" as const : "warning" as const },
    { label: "Active Runs", value: ai?.active_runs ?? 0, max: 10, unit: "", color: "primary" as const },
    { label: "Queue", value: ai?.queue_depth ?? 0, max: 10, unit: "", color: "warning" as const },
    { label: "Agents", value: (ai?.active_agents ?? 0) + (ai?.active_executives ?? 0) + (ai?.active_specialists ?? 0), max: 20, unit: "", color: "success" as const },
    { label: "Uptime", value: Math.min(Math.round((ai?.uptime_seconds ?? 0) / 3600 * 100) / 100, 24), max: 24, unit: "h", color: "primary" as const },
  ];

  const composite = Math.round(
    (gauges.reduce((sum, g) => {
      const v = Number(g.value);
      const m = Number(g.max ?? 100);
      if (!Number.isFinite(v) || !Number.isFinite(m) || m <= 0) return sum;
      return sum + Math.min(Math.max(v / m, 0), 1);
    }, 0) /
      gauges.length) *
      100
  );

  const compositeSafe = Number.isFinite(composite) ? composite : 0;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">System Health</span>
        </div>
        <PulseRing active color="hsl(var(--success))" size={6} />
      </div>
      <div className="panel-body space-y-2 p-5">
        <div className="mb-3 flex items-center gap-4 rounded-lg border border-border/20 bg-gradient-to-br from-background/40 to-background/10 px-4 py-3.5">
          <ScoreRing
            value={compositeSafe}
            size={72}
            strokeWidth={6}
            color={
              compositeSafe >= 70
                ? "hsl(158 62% 42%)"
                : compositeSafe >= 40
                  ? "hsl(38 88% 52%)"
                  : "hsl(0 72% 55%)"
            }
          />
          <div className="min-w-0 flex-1">
            <div className="section-kicker">Composite Score</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground/40">
              Normalized across 6 live subsystems
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
              <PulseRing active color="hsl(var(--success))" size={5} />
              {ai?.status ?? "\u2014"}
            </div>
          </div>
        </div>
        {gauges.map((g, i) => (
          <motion.div
            key={g.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.03 }}
          >
            <Gauge {...g} />
          </motion.div>
        ))}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/10 pt-3">
          <div>
            <div className="section-kicker">Calls</div>
            <div className="mt-0.5 font-mono text-xs tabular-nums text-foreground/70">
              {ai?.kernel.total_calls ?? 0}
            </div>
          </div>
          <div>
            <div className="section-kicker">Cache Hit</div>
            <div className="mt-0.5 font-mono text-xs tabular-nums text-foreground/70">
              {Math.round((ai?.kernel.cache_hit_rate ?? 0) * 100)}%
            </div>
          </div>
          <div>
            <div className="section-kicker">Cost</div>
            <div className="mt-0.5 font-mono text-xs tabular-nums text-foreground/70">
              ${Number(ai?.kernel.total_cost ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
