"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useHealthAiQuery } from "@/hooks/use-api";
import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { PulseRing } from "@/components/premium/page-transition";
import { Activity, ShieldCheck, Layers, Timer, Wifi, AlertTriangle } from "lucide-react";

interface HealthGaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  icon: typeof Activity;
  color?: "primary" | "success" | "warning" | "destructive";
}

const iconMap = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
};

function HealthGauge({ label, value, max = 100, unit = "", icon: Icon, color = "primary" }: HealthGaugeProps) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap = {
    primary: { bg: "bg-primary", text: "text-primary", glow: "hsla(var(--primary)/0.3)", border: "border-primary/20" },
    success: { bg: "bg-success", text: "text-success", glow: "hsla(var(--success)/0.3)", border: "border-success/20" },
    warning: { bg: "bg-warning", text: "text-warning", glow: "hsla(var(--warning)/0.3)", border: "border-warning/20" },
    destructive: { bg: "bg-destructive", text: "text-destructive", glow: "hsla(var(--destructive)/0.3)", border: "border-destructive/20" },
  };
  const c = colorMap[color];
  const ic = iconMap[color];
  const isCritical = pct < 25 && color === "destructive";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-background/30 p-3.5 transition-all duration-300 hover:shadow-[0_0_25px_-6px_hsl(var(--primary)/0.06)]",
        isCritical ? "border-destructive/30 hover:border-destructive/50" : "border-border/20 hover:border-border/40 hover:bg-background/50"
      )}
    >
      <motion.div
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full border border-current opacity-[0.04]"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-5 w-5 items-center justify-center rounded-md", ic.bg)}>
            <Icon className={cn("h-3 w-3", ic.text)} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">
            {label}
          </span>
        </div>
        <motion.span
          className={cn("font-mono text-xs font-bold tabular-nums", c.text)}
          key={Math.round(value)}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {Math.round(value)}{unit}
        </motion.span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
        {isCritical && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-full bg-destructive/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn("relative h-full rounded-full", c.bg)}
          style={{ boxShadow: `0 0 10px ${c.glow}` }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
      {isCritical && (
        <motion.div
          className="mt-1.5 flex items-center gap-1 text-[9px] text-destructive/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>Critical threshold</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export function SystemHealth() {
  const { data: ai } = useHealthAiQuery();
  const { metrics } = useAggregateMetrics();

  const activeAgents = (ai?.active_agents ?? 0) + (ai?.active_executives ?? 0) + (ai?.active_specialists ?? 0);
  const uptimeHours = Math.min(Math.round((ai?.uptime_seconds ?? 0) / 3600 * 100) / 100, 100);
  const providerHealth = ai?.status === "healthy" ? 100 : ai?.status === "degraded" ? 60 : 0;
  const orgHealth = Math.round((metrics.healthScore ?? 0) * 100);

  const gauges = [
    { label: "Provider Health", value: providerHealth, icon: ShieldCheck, color: providerHealth >= 80 ? "success" as const : "warning" as const },
    { label: "Organization Health", value: orgHealth, icon: Activity, color: orgHealth >= 80 ? "success" as const : orgHealth >= 40 ? "warning" as const : "destructive" as const },
    { label: "Active Runs", value: ai?.active_runs ?? 0, max: 10, icon: Timer, color: "primary" as const },
    { label: "Queue Depth", value: ai?.queue_depth ?? 0, max: 10, icon: Layers, color: "warning" as const },
    { label: "Active Agents", value: activeAgents, max: 20, icon: Wifi, color: "success" as const },
    { label: "Uptime", value: uptimeHours, unit: "h", icon: Timer, color: "primary" as const },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">System Health</span>
        </div>
        <div className="flex items-center gap-2">
          {providerHealth >= 80 ? (
            <PulseRing active color="hsl(var(--success))" size={6} />
          ) : (
            <PulseRing active color="hsl(var(--warning))" size={6} />
          )}
        </div>
      </div>
      <div className="panel-body space-y-2.5 p-4">
        {gauges.map((g) => (
          <HealthGauge key={g.label} {...g} />
        ))}
      </div>
    </div>
  );
}
