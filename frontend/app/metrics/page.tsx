"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/skeleton";
import { BarChart3, TrendingUp, PieChart, Activity, CheckCircle2, Clock, Users, UserPlus, GitBranch, RotateCcw, DollarSign, Zap } from "lucide-react";
import { useAggregateMetricsQuery, useChartDataQuery, useHealthAiQuery } from "@/hooks/use-api";

export default function MetricsPage() {
  const { data: agg, isLoading: aggLoading } = useAggregateMetricsQuery();
  const { data: charts, isLoading: chartsLoading } = useChartDataQuery();
  const { data: ai, isLoading: aiLoading } = useHealthAiQuery();

  const avgTokensPerCall =
    ai?.kernel && ai.kernel.total_calls > 0
      ? Math.round(ai.kernel.tokens_used / ai.kernel.total_calls)
      : null;

  const chartData = charts?.runtime_over_time ?? [];
  const hasChartData = chartData.length > 0 && chartData.some(d => d.average_runtime_seconds != null);

  const runtimeMinutes = agg?.average_runtime_seconds != null
    ? Math.round(agg.average_runtime_seconds / 60 * 10) / 10
    : null;

  if (aggLoading || chartsLoading || aiLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Analyze"
        title="Runtime Metrics"
        description={`Aggregated from ${agg?.total_runs ?? "—"} total objectives (${agg?.completed_runs ?? 0} completed, ${agg?.failed_runs ?? 0} failed)`}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          label="Total Runs"
          value={agg?.total_runs ?? "—"}
          format="number"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <MetricCard
          label="Success Rate"
          value={agg?.success_rate != null ? agg.success_rate : "—"}
          format="percent"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Runtime"
          value={runtimeMinutes != null ? runtimeMinutes : "—"}
          format="number"
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Confidence"
          value={agg?.average_confidence ?? agg?.average_plan_confidence ?? "—"}
          format="percent"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Executives Spawned"
          value={agg?.average_executives_spawned != null ? Math.round(agg.average_executives_spawned) : "—"}
          format="number"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Specialists Spawned"
          value={agg?.average_specialists_spawned != null ? Math.round(agg.average_specialists_spawned) : "—"}
          format="number"
          icon={<UserPlus className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Tokens/Call"
          value={avgTokensPerCall != null ? avgTokensPerCall : "—"}
          format="number"
          icon={<PieChart className="h-4 w-4" />}
        />
        <MetricCard
          label="Active Nodes"
          value={ai?.active_specialists ?? ai?.active_agents ?? "—"}
          format="number"
          icon={<Activity className="h-4 w-4" />}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          label="Avg Decisions"
          value={agg?.average_decisions != null ? Math.round(agg.average_decisions * 10) / 10 : "—"}
          format="number"
          icon={<GitBranch className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Milestones"
          value={agg?.average_milestones != null ? Math.round(agg.average_milestones * 10) / 10 : "—"}
          format="number"
          icon={<Zap className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Retries"
          value={agg?.average_retries != null ? agg.average_retries : "—"}
          format="number"
          icon={<RotateCcw className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Cost"
          value={agg?.average_cost != null ? `$${Math.round(agg.average_cost)}` : "—"}
          format="number"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-lg border border-border/50 bg-card"
      >
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-sm font-medium">Performance Over Time</h3>
        </div>
        <div className="flex min-h-80 items-center justify-center px-6 py-6">
          {hasChartData ? (
            <div className="w-full max-w-3xl">
              <p className="mb-4 text-xs text-muted-foreground">Runtime per day (seconds)</p>
              <div className="flex items-end gap-2" style={{ height: 200 }}>
                {chartData.map((d) => {
                  const maxRt = Math.max(...chartData.map(x => x.average_runtime_seconds ?? 0));
                  const h = maxRt > 0 ? ((d.average_runtime_seconds ?? 0) / maxRt) * 100 : 0;
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">{Math.round(d.average_runtime_seconds ?? 0)}s</span>
                      <div
                        className="w-full rounded-t bg-primary/60 transition-all"
                        style={{ height: `${Math.max(h, 4)}%` }}
                      />
                      <span className="text-[8px] text-muted-foreground">{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border/10 pt-4">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                  <Zap className="h-3 w-3 text-primary/60" />
                  {chartData.length} sampled days
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                  <Clock className="h-3 w-3 text-primary/60" />
                  avg {(runtimeMinutes ?? 0).toFixed(1)}m per run
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                  <CheckCircle2 className="h-3 w-3 text-success/70" />
                  {Math.round((agg?.success_rate ?? 0) * 100)}% success rate
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              icon={<BarChart3 className="h-5 w-5" />}
              title="No chart data yet"
              description="Runtime trends will appear here once objectives have completed."
            />
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-lg border border-border/50 bg-card"
      >
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-sm font-medium">Kernel Health</h3>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Calls"
            value={ai?.kernel.total_calls ?? "—"}
            format="number"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            label="Cache Hit Rate"
            value={ai?.kernel.cache_hit_rate != null ? Math.round(ai.kernel.cache_hit_rate * 100) : "—"}
            format="percent"
            icon={<Zap className="h-4 w-4" />}
          />
          <MetricCard
            label="Total Cost"
            value={ai?.kernel.total_cost != null ? `$${Number(ai.kernel.total_cost).toFixed(2)}` : "—"}
            format="number"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            label="Uptime"
            value={ai?.uptime_seconds != null ? `${Math.floor(ai.uptime_seconds / 3600)}h ${Math.floor((ai.uptime_seconds % 3600) / 60)}m` : "—"}
            format="raw"
            icon={<Activity className="h-4 w-4" />}
          />
        </div>
      </motion.div>
    </div>
  );
}
