"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/animated-counter";
import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number | null;
  format?: "number" | "percent" | "time" | "decimal";
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  subtitle?: string;
  tone?: string;
  className?: string;
  delay?: number;
}

const DELTA_TONES = {
  positive: "bg-success/10 text-success ring-success/20",
  negative: "bg-destructive/10 text-destructive ring-destructive/20",
  neutral: "bg-muted/20 text-muted-foreground ring-border/20",
};

export function StatCard({
  icon,
  label,
  value,
  format = "number",
  delta,
  deltaTone = "neutral",
  subtitle,
  tone = "hsl(var(--primary))",
  className,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn("bento-tile-accent group relative overflow-hidden p-5", className)}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(320px circle at 100% 0%, ${tone}0d, transparent 60%)`,
        }}
      />
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="metric-label">{label}</div>
          <div className="metric-value mt-1 text-foreground/90">
            {value != null ? (
              <AnimatedCounter value={value} format={format} />
            ) : (
              <span className="text-sm font-normal tracking-normal text-muted-foreground/30">
                No data
              </span>
            )}
          </div>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: `${tone}14`, borderColor: `${tone}22` }}
        >
          <span style={{ color: tone }}>{icon}</span>
        </div>
      </div>

      <div
        className="relative z-[1] mt-3 h-px w-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${tone}30, transparent)` }}
      />

      <div className="relative z-[1] mt-3 flex items-center gap-3">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
              DELTA_TONES[deltaTone]
            )}
          >
            {delta}
          </span>
        )}
        {subtitle && (
          <span className="truncate text-[10px] text-muted-foreground/50">{subtitle}</span>
        )}
      </div>
    </motion.div>
  );
}
