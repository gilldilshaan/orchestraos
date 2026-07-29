import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  format?: "number" | "percent" | "time" | "raw";
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  icon,
  trend,
  format = "raw",
  className,
}: MetricCardProps) {
  const formattedValue = () => {
    if (typeof value === "number") {
      switch (format) {
        case "percent":
          return `${(value * 100).toFixed(0)}%`;
        case "time":
          return `${value.toFixed(1)}s`;
        case "number":
          return value.toLocaleString();
        default:
          return value.toString();
      }
    }
    return value.toString();
  };

  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border/50 bg-card p-4 transition-all duration-200 hover:border-border hover:bg-card/80",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="text-muted-foreground/40 transition-colors group-hover:text-muted-foreground/70">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tracking-tight text-foreground">
          {formattedValue()}
        </span>
        {change && (
          <span className={cn("font-mono text-xs font-medium", trendColor)}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
