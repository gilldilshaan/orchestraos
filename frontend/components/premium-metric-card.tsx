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
}: PremiumMetricCardProps) {
  const trendStyle = trend ? TREND_COLORS[trend.direction] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "bento-tile-accent p-5",
        className
      )}
    >
      <div className="relative z-[1] flex items-start justify-between">
        <div>
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
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
      </div>

      <div className="relative z-[1] mt-4 flex items-center gap-3">
        {trend && trendStyle && (
          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium", trendStyle.bg, trendStyle.text, trendStyle.ring)}>
            {trend.direction === "up" ? "\u2191" : trend.direction === "down" ? "\u2193" : "\u2192"} {trend.value}
          </span>
        )}
        {subtitle && (
          <span className="text-[10px] text-muted-foreground/50">{subtitle}</span>
        )}
      </div>
    </motion.div>
  );
}
