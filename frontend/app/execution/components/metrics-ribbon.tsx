"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useMetrics } from "@/hooks/use-dashboard";
import { useSSEStore } from "@/store/sse-store";
import { useEventsQuery, useTelemetrySummaryQuery } from "@/hooks/use-api";
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
  const { data: persistedEvents } = useEventsQuery(objectiveId ?? null);
  const { data: telemetrySummary } = useTelemetrySummaryQuery(objectiveId ?? null);

  const runtime = useMemo(() => {
    if (sseEvents.length > 0) {
      const first = sseEvents[0];
      const last = sseEvents[sseEvents.length - 1];
      if (first?.timestamp && last?.timestamp) {
        return (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 1000;
      }
    }
    if (telemetrySummary?.total_runtime_ms) {
      return telemetrySummary.total_runtime_ms / 1000;
    }
    if (Array.isArray(persistedEvents) && persistedEvents.length > 0) {
      const first = persistedEvents[0];
      const last = persistedEvents[persistedEvents.length - 1];
      if (first?.created_at && last?.created_at) {
        return (new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / 1000;
      }
    }
    return metrics.avgRuntime;
  }, [sseEvents, persistedEvents, telemetrySummary, metrics.avgRuntime]);

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
