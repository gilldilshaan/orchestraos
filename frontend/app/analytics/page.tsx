"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/skeleton";
import { ScoreRing } from "@/components/score-ring";
import {
  useAggregateMetricsQuery,
  useChartDataQuery,
  useHealthAiQuery,
  useHealthOrganizationQuery,
} from "@/hooks/use-api";
import {
  BarChart3, CheckCircle2, Clock, TrendingUp,
  Users, UserPlus, Cpu, DollarSign, Activity,
  RotateCcw, GitBranch, Zap,
} from "lucide-react";

export default function AnalyticsPage() {
  const { data: agg, isLoading: aggLoading } = useAggregateMetricsQuery();
  const { data: charts, isLoading: chartsLoading } = useChartDataQuery();
  const { data: ai, isLoading: aiLoading } = useHealthAiQuery();
  const { data: org, isLoading: orgLoading } = useHealthOrganizationQuery();

  const runtimeMinutes = agg?.average_runtime_seconds != null
    ? Math.round((agg.average_runtime_seconds / 60) * 10) / 10
    : null;

  const avgTokensPerCall = ai?.kernel && ai.kernel.total_calls > 0
    ? Math.round(ai.kernel.tokens_used / ai.kernel.total_calls)
    : null;

  const hasRuntimeChart = (charts?.runtime_over_time?.length ?? 0) > 0;
  const hasConfidenceChart = (charts?.confidence_trend?.length ?? 0) > 0;
  const hasSuccessChart = (charts?.success_rate_trend?.length ?? 0) > 0;

  const runtimeData = useMemo(
    () =>
      (charts?.runtime_over_time ?? []).map((d) => ({
        date: d.date.slice(5),
        runtime: d.average_runtime_seconds ?? 0,
        runs: d.run_count,
      })),
    [charts],
  );

  const confidenceData = useMemo(
    () =>
      (charts?.confidence_trend ?? []).map((d) => ({
        date: d.date.slice(5),
        confidence: d.average_confidence ?? 0,
        runs: d.run_count,
      })),
    [charts],
  );

  const successData = useMemo(
    () =>
      (charts?.success_rate_trend ?? []).map((d) => ({
        date: d.date.slice(5),
        rate: d.success_rate ?? 0,
        total: d.total_runs,
        succeeded: d.succeeded,
      })),
    [charts],
  );

  const failureRate = agg && agg.total_runs > 0
    ? (agg.failed_runs / agg.total_runs) * 100
    : null;

  const activeObjectives = org?.active_objectives ?? 0;
  const completedObjectives = org?.completed_objectives ?? 0;
  const failedObjectives = org?.failed_objectives ?? 0;

  if (aggLoading || chartsLoading || aiLoading || orgLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Analyze"
        title="Runtime Analytics"
        description="Execution intelligence, trends, and failure analysis"
      />

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
          label="Failure Rate"
          value={failureRate != null ? failureRate / 100 : "—"}
          format="percent"
          icon={<Activity className="h-4 w-4" />}
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
          label="Executives"
          value={agg?.average_executives_spawned != null ? Math.round(agg.average_executives_spawned) : "—"}
          format="number"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          label="Specialists"
          value={agg?.average_specialists_spawned != null ? Math.round(agg.average_specialists_spawned) : "—"}
          format="number"
          icon={<UserPlus className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Tokens/Call"
          value={avgTokensPerCall != null ? avgTokensPerCall : "—"}
          format="number"
          icon={<Cpu className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Cost"
          value={agg?.average_cost != null ? `$${Math.round(agg.average_cost)}` : "—"}
          format="number"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Retries"
          value={agg?.average_retries != null ? agg.average_retries : "—"}
          format="number"
          icon={<RotateCcw className="h-4 w-4" />}
        />
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
      </motion.div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Runtime over time */}
        <ChartCard title="Runtime Over Time" hasData={hasRuntimeChart}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={runtimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground) / 0.5)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground) / 0.5)" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="runtime"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                name="Runtime (s)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Confidence trend */}
        <ChartCard title="Confidence Trend" hasData={hasConfidenceChart}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground) / 0.5)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground) / 0.5)" domain={[0, 1]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="confidence"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.15)"
                strokeWidth={2}
                name="Confidence"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Success rate */}
        <ChartCard title="Success Rate Trend" hasData={hasSuccessChart}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={successData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground) / 0.5)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground) / 0.5)" domain={[0, 1]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="rate" fill="hsl(var(--primary) / 0.7)" radius={[4, 4, 0, 0]} name="Success Rate" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Failure analysis summary */}
        <ChartCard title="Failure Analysis" hasData={agg != null}>
          <div className="p-4 space-y-4">
            {agg && (
              <div className="flex items-center gap-5 rounded-xl border border-border/20 bg-background/30 p-4">
                <ScoreRing
                  value={Math.round((agg.success_rate ?? 0) * 100)}
                  size={76}
                  strokeWidth={6}
                  color="hsl(158 62% 42%)"
                />
                <div className="min-w-0 flex-1">
                  <div className="section-kicker">Success Rate</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground/85">
                    {Math.round((agg.success_rate ?? 0) * 100)}% of all runs completed
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="chip text-success">{agg.completed_runs} completed</span>
                    <span className="chip text-destructive">{agg.failed_runs} failed</span>
                    {failureRate != null && (
                      <span className="chip">
                        {failureRate.toFixed(1)}% failure rate
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Active
                </div>
                <div className="font-mono text-lg font-semibold tabular-nums text-blue-400">
                  {activeObjectives}
                </div>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Completed
                </div>
                <div className="font-mono text-lg font-semibold tabular-nums text-emerald-400">
                  {completedObjectives}
                </div>
              </div>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Failed
                </div>
                <div className="font-mono text-lg font-semibold tabular-nums text-red-400">
                  {failedObjectives}
                </div>
              </div>
            </div>
            {agg && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed Runs</span>
                  <span className="font-mono tabular-nums">{agg.completed_runs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Failed Runs</span>
                  <span className="font-mono tabular-nums">{agg.failed_runs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Peak Parallelism</span>
                  <span className="font-mono tabular-nums">{agg.peak_parallelism ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Stage Duration</span>
                  <span className="font-mono tabular-nums">
                    {agg.average_stage_duration_seconds != null
                      ? `${agg.average_stage_duration_seconds.toFixed(1)}s`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Event Count</span>
                  <span className="font-mono tabular-nums">
                    {agg.average_event_count != null
                      ? Math.round(agg.average_event_count)
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Kernel health */}
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
            icon={<Cpu className="h-4 w-4" />}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ChartCard({
  title,
  hasData,
  children,
}: {
  title: string;
  hasData: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border border-border/50 bg-card"
    >
      <div className="border-b border-border/50 px-5 py-3.5">
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {hasData ? (
        <div className="p-4">{children}</div>
      ) : (
        <div className="flex h-60 items-center justify-center p-6">
          <EmptyState
            compact
            icon={<BarChart3 className="h-5 w-5" />}
            title="No chart data yet"
            description="Trends will appear here once runs have been recorded."
          />
        </div>
      )}
    </motion.div>
  );
}
