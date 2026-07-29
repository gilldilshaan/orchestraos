"use client";

import { motion } from "motion/react";
import type { ExecutionStatus } from "@/types";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Circle,
} from "lucide-react";

interface ExecutionStatusIndicatorProps {
  status: ExecutionStatus;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconMap = {
  idle: Circle,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  paused: PauseCircle,
};

const colorMap: Record<ExecutionStatus, string> = {
  idle: "text-muted-foreground",
  running: "text-primary",
  completed: "text-success",
  failed: "text-destructive",
  paused: "text-warning",
};

export function ExecutionStatusIndicator({
  status,
  label,
  size = "md",
  className,
}: ExecutionStatusIndicatorProps) {
  const Icon = iconMap[status];
  const sizeClass = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {status === "running" ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Icon className={cn(sizeClass, colorMap[status])} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Icon className={cn(sizeClass, colorMap[status])} />
        </motion.div>
      )}
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
