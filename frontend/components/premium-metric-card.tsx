"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/animated-counter";
import type { ReactNode } from "react";

interface SparklinePoint {
  value: number;
  label: string;
}

interface PremiumMetricCardProps {
  icon: ReactNode;
  label: string;
  value: number | null;
  format?: "number" | "percent" | "time" | "decimal";
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  subtitle?: string;
  sparkline?: SparklinePoint[];
  className?: string;
  delay?: number;
  tone?: string;
}

const TREND_COLORS = {
  up: { text: "text-success", bg: "bg-success/10", ring: "border-success/20" },
  down: { text: "text-destructive", bg: "bg-destructive/10", ring: "border-destructive/20" },
  neutral: { text: "text-muted-foreground", bg: "bg-muted/20", ring: "border-border/20" },
};

export function PremiumMetricCard({
  icon,
  label,
  value,
  format = "number",
  trend,
  subtitle,
  className,
  delay = 0,
  tone = "hsl(var(--primary))",
}: PremiumMetricCardProps) {
  const trendStyle = trend ? TREND_COLORS[trend.direction] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn("bento-tile-accent group p-5", className)}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(320px circle at 100% 0%, ${tone}0d, transparent 60%)`,
        }}
      />
      <div className="relative z-[1] flex items-start justify-between">
        <div className="min-w-0">
          <div className="metric-label">{label}</div>
          <div
            className="metric-value mt-1 text-foreground/90"
            style={value != null ? { color: "hsl(var(--foreground) / 0.9)" } : undefined}
          >
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
        {trend && trendStyle && (
          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium", trendStyle.bg, trendStyle.text, trendStyle.ring)}>
            {trend.direction === "up" ? "\u2191" : trend.direction === "down" ? "\u2193" : "\u2192"} {trend.value}
          </span>
        )}
        {subtitle && (
          <span className="truncate text-[10px] text-muted-foreground/50">{subtitle}</span>
        )}
      </div>
    </motion.div>
  );
}
