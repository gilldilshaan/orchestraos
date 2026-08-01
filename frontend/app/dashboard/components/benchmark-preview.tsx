"use client";

import { motion } from "motion/react";
import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "./empty-state";

export function BenchmarkPreview() {
  const { metrics } = useAggregateMetrics();

  const benchmarks = [
    { label: "Total Runs", value: metrics.totalRuns, color: "text-primary" },
    { label: "Success Rate", value: metrics.successRate != null ? `${Math.round(metrics.successRate * 100)}%` : "\u2014", color: "text-success" },
    { label: "Avg. Confidence", value: metrics.avgConfidence != null ? `${Math.round(metrics.avgConfidence * 100)}%` : "\u2014", color: "text-primary" },
  ];

  return (
    <div className="bento-tile p-5">
      <div className="relative z-[1]">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-xs font-semibold text-foreground/80">Aggregate Metrics</h2>
        </div>

        {metrics.totalRuns > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {benchmarks.map((b) => (
              <div key={b.label} className="rounded-lg border border-border/20 bg-background/30 p-3">
                <div className="section-kicker">{b.label}</div>
                <div className={`mt-1 font-mono text-base font-semibold ${b.color}`}>
                  {b.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BarChart3 className="h-4 w-4" />}
            title="No aggregate data yet"
            description="Run a pipeline to populate success rate, confidence and runtime metrics."
            compact
          />
        )}
      </div>
    </div>
  );
}
