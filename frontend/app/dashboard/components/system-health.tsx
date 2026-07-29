"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useHealthAiQuery, useHealthOrganizationQuery } from "@/hooks/use-api";
import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { PulseRing } from "@/components/premium/telemetry-viz";

interface GaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color?: "primary" | "success" | "warning" | "destructive";
}

function Gauge({ label, value, max = 100, unit = "", color = "primary" }: GaugeProps) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap = {
    primary: { bg: "bg-primary", ring: "hsl(var(--primary))" },
    success: { bg: "bg-success", ring: "hsl(var(--success))" },
    warning: { bg: "bg-warning", ring: "hsl(var(--warning))" },
    destructive: { bg: "bg-destructive", ring: "hsl(var(--destructive))" },
  };
  const colors = colorMap[color];

  return (
    <motion.div
      className="group relative overflow-hidden rounded-lg border border-border/30 bg-background/50 p-3 transition-all duration-200 hover:border-border/60"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-xs font-medium tabular-nums">
          {value}{unit}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className={cn("relative h-full rounded-full", colors.bg)}
        >
          {value > 90 && (
            <motion.div
              className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full"
              style={{ backgroundColor: colors.ring, opacity: 0.3 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function SystemHealth() {
  const { data: ai } = useHealthAiQuery();
  const { data: orgHealth } = useHealthOrganizationQuery();
  const { metrics } = useAggregateMetrics();

  const gauges = [
    { label: "Provider Health", value: ai?.status === "healthy" ? 100 : ai?.status === "degraded" ? 60 : 0, color: ai?.status === "healthy" ? "success" as const : "warning" as const },
    { label: "Organization Health", value: Math.round((metrics.healthScore ?? 0) * 100), color: (metrics.healthScore ?? 0) > 0.8 ? "success" as const : "warning" as const },
    { label: "Active Runs", value: ai?.active_runs ?? 0, max: 10, unit: "", color: "primary" as const },
    { label: "Queue Depth", value: ai?.queue_depth ?? 0, max: 10, unit: "", color: "warning" as const },
    { label: "Active Agents", value: (ai?.active_agents ?? 0) + (ai?.active_executives ?? 0) + (ai?.active_specialists ?? 0), max: 20, unit: "", color: "success" as const },
    { label: "Uptime", value: Math.min(Math.round((ai?.uptime_seconds ?? 0) / 3600 * 100) / 100, 100), unit: "h", color: "primary" as const },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border/80"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">System Health</h2>
          <PulseRing active color="hsl(var(--success))" size={10} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {gauges.map((g, i) => (
            <Gauge key={g.label} {...g} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
