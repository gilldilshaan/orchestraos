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
  value: number;
  format?: "number" | "percent" | "time" | "decimal";
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  subtitle?: string;
  sparkline?: SparklinePoint[];
  className?: string;
  delay?: number;
}

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
  const trendColor =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  const trendIcon =
    trend?.direction === "up" ? "↑" : trend?.direction === "down" ? "↓" : "→";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border/80 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
        className
      )}
    >
      {/* Icon */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend.direction === "up"
                ? "bg-success/10 text-success"
                : trend.direction === "down"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {trendIcon} {trend.value}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="text-2xl font-semibold tracking-tight">
        <AnimatedCounter value={value} format={format} />
      </div>

      {/* Label */}
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>

      {/* Subtitle */}
      {subtitle && (
        <div className="mt-2 border-t border-border/30 pt-2 text-[10px] text-muted-foreground/60">
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}
