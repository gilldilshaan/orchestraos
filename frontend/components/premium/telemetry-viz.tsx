"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TelemetryMetricProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  className?: string;
  color?: string;
}

export function TelemetryMetric({
  label,
  value,
  change,
  changeLabel,
  className,
  color = "hsl(var(--primary))",
}: TelemetryMetricProps) {
  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border/30 bg-card/50 p-3",
        className
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    >
      <div
        className="absolute left-0 top-0 h-full w-0.5 opacity-50"
        style={{ backgroundColor: color }}
      />
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <motion.p
        className="mt-0.5 text-lg font-semibold tracking-tight"
        style={{ color }}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
      >
        {value}
      </motion.p>
      {(change !== undefined || changeLabel) && (
        <div className="mt-0.5 flex items-center gap-1.5">
          {change !== undefined && (
            <span
              className={cn(
                "text-[10px] font-medium",
                change > 0 && "text-success",
                change < 0 && "text-destructive",
                change === 0 && "text-muted-foreground"
              )}
            >
              {change > 0 ? "+" : ""}
              {change}%
            </span>
          )}
          {changeLabel && (
            <span className="text-[10px] text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
      <div
        className="mt-2 h-px w-full opacity-20"
        style={{
          background: `linear-gradient(90deg, ${color}, transparent)`,
        }}
      />
    </motion.div>
  );
}

interface TimelineEventProps {
  title: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "decision";
  description?: string;
  active?: boolean;
}

export function TimelineEvent({ title, timestamp, type, description, active }: TimelineEventProps) {
  const colors = {
    info: "hsl(var(--primary))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    error: "hsl(var(--destructive))",
    decision: "hsl(var(--glow-purple))",
  };

  const color = colors[type];

  return (
    <motion.div
      className="group relative flex gap-3 py-2"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          className="h-2.5 w-2.5 rounded-full border-2"
          style={{
            borderColor: color,
            backgroundColor: active ? color : "transparent",
          }}
          animate={active ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div
          className="mt-1 h-full w-px"
          style={{ backgroundColor: `${color}20` }}
        />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-[10px] text-muted-foreground">{timestamp}</span>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </motion.div>
  );
}

interface PulseRingProps {
  active?: boolean;
  color?: string;
  size?: number;
  className?: string;
}

export function PulseRing({ active = true, color = "hsl(var(--primary))", size = 12, className }: PulseRingProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {active && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            opacity: 0.3,
          }}
          animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div
        className="rounded-full"
        style={{
          width: size / 2,
          height: size / 2,
          backgroundColor: active ? color : `${color}40`,
        }}
      />
    </div>
  );
}
