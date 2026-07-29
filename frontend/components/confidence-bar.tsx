"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
}

export function ConfidenceBar({
  value,
  label,
  showValue = true,
  size = "md",
  className,
  animate = true,
}: ConfidenceBarProps) {
  const clampedValue = Math.max(0, Math.min(1, value));
  const percentage = clampedValue * 100;

  const barColor =
    clampedValue >= 0.8
      ? "bg-success"
      : clampedValue >= 0.5
        ? "bg-warning"
        : "bg-destructive";

  const heightClass =
    size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {label}
            </span>
          )}
          {showValue && (
            <span className="font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
              {(clampedValue * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn("w-full overflow-hidden rounded-full bg-muted", heightClass)}
      >
        <motion.div
          initial={animate ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={cn("h-full rounded-full transition-colors", barColor)}
        />
      </div>
    </div>
  );
}
