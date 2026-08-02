import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/20 pb-6 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {kicker && (
          <div className="mb-2 flex items-center gap-2">
            <span className="h-3.5 w-0.5 rounded-full bg-primary/70" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
              {kicker}
            </span>
          </div>
        )}
        <h1 className="text-balance text-xl font-semibold tracking-tight text-foreground/95 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="text-pretty mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground/60">
            {description}
          </p>
        )}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground/90">{title}</h2>
        {description && (
          <p className="text-pretty mt-0.5 text-[11px] text-muted-foreground/50">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
