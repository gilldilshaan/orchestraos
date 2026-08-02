import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border/40 bg-muted/10 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-60" />
      {icon && (
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border/30 bg-card text-muted-foreground/40">
          {icon}
        </div>
      )}
      <p className="relative text-sm font-medium text-foreground/70">{title}</p>
      {description && (
        <p className="relative max-w-sm text-[11px] leading-relaxed text-muted-foreground/50">
          {description}
        </p>
      )}
      {action && <div className="relative mt-1">{action}</div>}
    </div>
  );
}
