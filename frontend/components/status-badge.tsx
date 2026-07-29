import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, XCircle, AlertTriangle, PauseCircle, Circle } from "lucide-react";
import type { FC, SVGProps } from "react";

type IconType = FC<SVGProps<SVGSVGElement>>;

const statusConfig = {
  completed:  { label: "Completed",  icon: CheckCircle2,  color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10",        glow: "shadow-emerald-500/10" },
  running:    { label: "Running",    icon: Loader2,       color: "text-blue-400",    border: "border-blue-500/20",    bg: "bg-blue-500/10",           glow: "shadow-blue-500/10" },
  failed:     { label: "Failed",     icon: XCircle,       color: "text-red-400",     border: "border-red-500/20",     bg: "bg-red-500/10",            glow: "shadow-red-500/10" },
  error:      { label: "Error",      icon: XCircle,       color: "text-red-400",     border: "border-red-500/20",     bg: "bg-red-500/10",            glow: "shadow-red-500/10" },
  paused:     { label: "Paused",     icon: PauseCircle,   color: "text-amber-400",   border: "border-amber-500/20",   bg: "bg-amber-500/10",          glow: "shadow-amber-500/10" },
  waiting:    { label: "Waiting",    icon: Circle,        color: "text-muted-foreground", border: "border-border/30", bg: "bg-muted/20",             glow: "" },
  queued:     { label: "Queued",     icon: Circle,        color: "text-muted-foreground", border: "border-border/30", bg: "bg-muted/20",             glow: "" },
  idle:       { label: "Idle",       icon: Circle,        color: "text-muted-foreground", border: "border-border/30", bg: "bg-muted/20",             glow: "" },
  started:    { label: "In Progress",icon: Loader2,       color: "text-blue-400",    border: "border-blue-500/20",    bg: "bg-blue-500/10",           glow: "shadow-blue-500/10" },
  progress:   { label: "In Progress",icon: Loader2,       color: "text-blue-400",    border: "border-blue-500/20",    bg: "bg-blue-500/10",           glow: "shadow-blue-500/10" },
  connected:  { label: "Live",       icon: Circle,        color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10",        glow: "shadow-emerald-500/10" },
} as const;

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function StatusBadge({ status, className, size = "sm", showLabel = true }: StatusBadgeProps) {
  const cfg = statusConfig[status as keyof typeof statusConfig];
  if (!cfg) {
    const s = statusConfig.idle;
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-md font-medium", size === "sm" ? "px-1.5 py-0.5 text-[10px]" : size === "md" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm", s.bg, s.border, s.color, className)}>
        <s.icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {showLabel && status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }
  const Icon = cfg.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md font-medium transition-all", size === "sm" ? "px-1.5 py-0.5 text-[10px]" : size === "md" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm", cfg.bg, cfg.border, cfg.color, cfg.glow, className)}>
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", (status === "running" || status === "started" || status === "progress") && "animate-spin")} />
      {showLabel && cfg.label}
    </span>
  );
}
