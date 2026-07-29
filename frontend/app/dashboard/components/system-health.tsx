"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { PulseRing } from "@/components/premium/telemetry-viz";

interface GaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  color?: "primary" | "success" | "warning" | "destructive";
}

function Gauge({ label, value, max = 100, unit = "%", color = "primary" }: GaugeProps) {
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
          {value}
          {unit}
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

const gauges = [
  { label: "Telemetry Health", value: 98, color: "success" as const },
  { label: "Organization Health", value: 91, color: "success" as const },
  { label: "Execution Queue", value: 23, color: "primary" as const },
  { label: "Retry Queue", value: 5, color: "warning" as const },
  { label: "Supervisor Health", value: 95, color: "success" as const },
  { label: "Decision Confidence", value: 87, color: "success" as const },
];

export function SystemHealth() {
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
