"use client";

import { useSearchParams } from "next/navigation";
import { useMetrics } from "@/hooks/use-dashboard";
import { useSSEStore } from "@/store/sse-store";
import { AnimatedCounter } from "@/components/animated-counter";
import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: string | number | null;
  format?: "number" | "percent" | "time" | "decimal";
  color?: string;
  tooltip?: string;
}

function Metric({ label, value, format, color }: MetricProps) {
  const display = value != null
    ? format && typeof value === "number"
      ? <AnimatedCounter value={value} format={format} duration={0.6} />
      : <span className="font-mono text-[13px] font-semibold tabular-nums">{String(value)}</span>
    : <span className="font-mono text-[13px] font-semibold tabular-nums">—</span>;

  return (
    <div className="flex flex-col items-center px-3 py-1 first:pl-0">
      <span className={cn("font-mono text-[13px] font-semibold tabular-nums leading-tight", color ?? "text-foreground/90")}>
        {display}
      </span>
      <span className="mt-0.5 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.06em] text-muted-foreground/50">
        {label}
      </span>
    </div>
  );
}

export function MetricsRibbon() {
  const searchParams = useSearchParams();
  const objectiveId = searchParams.get("id") ?? undefined;
  const { metrics } = useMetrics(objectiveId);
  const sseProgress = useSSEStore((s) => s.progress);
  const sseConnected = useSSEStore((s) => s.connected);
  const sseEvents = useSSEStore((s) => s.events);

  const runtime = (() => {
    if (!sseEvents.length) return metrics.avgRuntime;
    const first = sseEvents[0];
    const last = sseEvents[sseEvents.length - 1];
    if (!first?.timestamp || !last?.timestamp) return metrics.avgRuntime;
    return (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 1000;
  })();

  return (
    <div className="flex items-center border-t border-border/30 bg-card/60 px-2 py-1 backdrop-blur-sm">
      <div className="flex flex-1 items-center justify-around divide-x divide-border/20">
        <Metric
          label="Progress"
          value={sseConnected ? `${Math.round(sseProgress)}%` : metrics.avgConfidence != null ? `${Math.round(metrics.avgConfidence * 100)}%` : "—"}
          color="text-primary"
        />
        <Metric
          label="Runtime"
          value={runtime}
          format="time"
        />
        <Metric
          label="Parallelism"
          value={metrics.parallelism}
          format="number"
        />
        <Metric
          label="Executives"
          value={metrics.executivesSpawned}
          format="number"
          color="text-violet-400"
        />
        <Metric
          label="Specialists"
          value={metrics.specialistsSpawned}
          format="number"
          color="text-emerald-400"
        />
        <Metric
          label="Retries"
          value={metrics.avgRetries}
          format="decimal"
        />
        <Metric
          label="Confidence"
          value={metrics.avgConfidence}
          format="percent"
          color="text-amber-400"
        />
        <Metric
          label="Health"
          value={metrics.healthScore}
          format="percent"
          color={metrics.healthScore != null ? (metrics.healthScore >= 0.8 ? "text-emerald-400" : metrics.healthScore >= 0.5 ? "text-amber-400" : "text-red-400") : undefined}
        />
      </div>
    </div>
  );
}
