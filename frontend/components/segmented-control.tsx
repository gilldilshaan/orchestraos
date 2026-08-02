"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border/30 bg-muted/20 p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-md font-medium transition-colors duration-150",
              size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
              active ? "text-foreground/90" : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            {active && (
              <motion.div
                layoutId="segmented-active"
                className="absolute inset-0 rounded-md border border-border/40 bg-card shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {opt.icon && <span className="relative z-[1]">{opt.icon}</span>}
            <span className="relative z-[1]">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
