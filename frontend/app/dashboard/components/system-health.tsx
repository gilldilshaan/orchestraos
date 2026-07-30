"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useHealthAiQuery, useHealthOrganizationQuery } from "@/hooks/use-api";
import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { PulseRing } from "@/components/premium/page-transition";

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
    primary: { bg: "bg-primary", ring: "hsl(var(--primary))", glow: "0 0 6px hsl(var(--primary)/0.3)" },
    success: { bg: "bg-success", ring: "hsl(var(--success))", glow: "0 0 6px hsl(var(--success)/0.3)" },
    warning: { bg: "bg-warning", ring: "hsl(var(--warning))", glow: "0 0 6px hsl(var(--warning)/0.3)" },
    destructive: { bg: "bg-destructive", ring: "hsl(var(--destructive))", glow: "0 0 6px hsl(var(--destructive)/0.3)" },
  };
  const colors = colorMap[color];

  return (
    <motion.div
      className="group relative overflow-hidden rounded-lg border border-border/20 bg-background/30 p-3 transition-all duration-200 hover:border-border/40 hover:bg-background/50"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/50">
          {label}
        </span>
        <motion.span
          className="font-mono text-xs font-medium tabular-nums text-foreground/70"
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {value}{unit}
        </motion.span>
      </div>
      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className={cn("relative h-full rounded-full", colors.bg)}
          style={{ boxShadow: colors.glow }}
        >
          {value > 90 && (
            <motion.div
              className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full"
              style={{ backgroundColor: colors.ring, opacity: 0.2 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
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
      className="enterprise-panel p-5"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80">System Health</h2>
          <PulseRing active color="hsl(var(--success))" size={8} />
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
