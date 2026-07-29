import { cn } from "@/lib/utils";
import type { ExecutionStatus, RiskLevel } from "@/types";

const statusConfig: Record<
  ExecutionStatus,
  { label: string; className: string; dotClass: string }
> = {
  idle: {
    label: "Idle",
    className: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  running: {
    label: "Running",
    className: "bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success",
    dotClass: "bg-success",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
  paused: {
    label: "Paused",
    className: "bg-warning/10 text-warning",
    dotClass: "bg-warning",
  },
};

const riskConfig: Record<
  RiskLevel,
  { label: string; className: string; dotClass: string }
> = {
  low: {
    label: "Low",
    className: "bg-success/10 text-success",
    dotClass: "bg-success",
  },
  medium: {
    label: "Medium",
    className: "bg-warning/10 text-warning",
    dotClass: "bg-warning",
  },
  high: {
    label: "High",
    className: "bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
  critical: {
    label: "Critical",
    className:
      "bg-destructive/20 text-destructive border border-destructive/30",
    dotClass: "bg-destructive",
  },
};

interface HealthBadgeProps {
  status: ExecutionStatus | RiskLevel;
  type?: "status" | "risk";
  className?: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

export function HealthBadge({
  status,
  type = "status",
  className,
  showDot = true,
  size = "sm",
}: HealthBadgeProps) {
  const config =
    type === "risk"
      ? riskConfig[status as RiskLevel]
      : statusConfig[status as ExecutionStatus];

  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.className,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            type === "status" && status === "running" && "animate-pulse-dot",
            config.dotClass
          )}
        />
      )}
      {config.label}
    </span>
  );
}
