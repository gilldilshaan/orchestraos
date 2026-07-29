"use client";

import { motion } from "motion/react";
import { useMetrics } from "@/hooks/use-dashboard";
import { AnimatedCounter } from "@/components/animated-counter";
import { cn } from "@/lib/utils";

const ribbonMetrics = [
  { label: "Runtime", key: "avgRuntime" as const, format: "time" as const },
  { label: "Parallelism", key: "parallelism" as const, format: "number" as const },
  { label: "Executives", key: "executivesSpawned" as const, format: "number" as const },
  { label: "Specialists", key: "specialistsSpawned" as const, format: "number" as const },
  { label: "Retries", key: "avgRetries" as const, format: "decimal" as const },
  { label: "Confidence", key: "avgConfidence" as const, format: "percent" as const },
  { label: "Health", key: "healthScore" as const, format: "percent" as const },
];

export function MetricsRibbon() {
  const { metrics } = useMetrics();

  return (
    <div className="flex items-center border-t border-border/50 bg-card/80 px-4 py-1.5 backdrop-blur-sm">
      <div className="flex flex-1 items-center divide-x divide-border/30">
        {ribbonMetrics.map((m) => (
          <div key={m.label} className="flex items-center gap-2 px-3 first:pl-0">
            <span className="text-[10px] text-muted-foreground/70">{m.label}</span>
            <span className="font-mono text-[11px] font-medium tabular-nums text-foreground/90">
              <AnimatedCounter value={metrics[m.key]} format={m.format} duration={0.8} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
