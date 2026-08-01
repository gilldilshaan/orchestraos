"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  hint?: string;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  hint,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/40 bg-background/20 text-center",
        compact ? "px-4 py-6" : "px-6 py-10",
        className
      )}
    >
      <div className="pointer-events-none absolute -top-10 left-1/2 h-24 w-40 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl" />
      <motion.div
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary/60"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {icon}
      </motion.div>
      <p className="relative mt-3 text-xs font-medium text-foreground/60">{title}</p>
      <p className="relative mt-1 max-w-[260px] text-[11px] leading-relaxed text-muted-foreground/45">
        {description}
      </p>
      {hint && (
        <p className="relative mt-2 font-mono text-[10px] text-primary/50">{hint}</p>
      )}
    </motion.div>
  );
}
