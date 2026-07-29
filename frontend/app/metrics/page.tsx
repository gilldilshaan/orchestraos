"use client";

import { motion } from "motion/react";
import { MetricCard } from "@/components/metric-card";
import { BarChart3, TrendingUp, PieChart, Activity } from "lucide-react";
import { useHealthOrganizationQuery, useHealthAiQuery } from "@/hooks/use-api";
import { useAggregateMetrics } from "@/hooks/use-dashboard";

export default function MetricsPage() {
  const { data: org } = useHealthOrganizationQuery();
  const { data: ai } = useHealthAiQuery();
  const { metrics } = useAggregateMetrics();

  const totalExecutions = org
    ? org.completed_objectives + org.failed_objectives + org.active_objectives
    : null;

  const avgTokensPerCall =
    ai?.kernel && ai.kernel.total_calls > 0
      ? Math.round(ai.kernel.tokens_used / ai.kernel.total_calls)
      : null;

  const activeNodes = org?.active_specialists ?? null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">
          Runtime Metrics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Detailed execution metrics and performance data
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          label="Total Executions"
          value={totalExecutions != null ? totalExecutions : "—"}
          format="number"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Confidence"
          value={metrics.avgConfidence != null ? metrics.avgConfidence : "—"}
          format="percent"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Tokens/Call"
          value={avgTokensPerCall != null ? avgTokensPerCall : "—"}
          format="number"
          icon={<PieChart className="h-4 w-4" />}
        />
        <MetricCard
          label="Active Nodes"
          value={activeNodes != null ? activeNodes : "—"}
          format="number"
          icon={<Activity className="h-4 w-4" />}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-lg border border-border/50 bg-card"
      >
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-sm font-medium">Performance Over Time</h3>
        </div>
        <div className="flex h-80 items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">
            <p>Charts are not yet available. Time-series trend data will be exposed once the telemetry backend service collects sufficient history.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
