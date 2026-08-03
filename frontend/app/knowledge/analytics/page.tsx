"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { type MemoryAnalytics } from "@/types";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import {
  Brain,
  BookOpen,
  Lightbulb,
  Target,
  Scale,
  Repeat,
  TrendingUp,
  Sparkles,
  Layers,
  RefreshCw,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

const AXIS_TICK = { fontSize: 10 } as const;
const AXIS_STROKE = "hsl(var(--muted-foreground) / 0.5)";

function ChartCard({
  title,
  description,
  children,
  hasData,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  hasData: boolean;
}) {
  return (
    <PremiumCard variant="glass" className="p-5" hoverEffect="glow">
      <SectionHeader title={title} description={description} />
      <div className="mt-4 h-[250px]">
        {hasData ? (
          children
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground/30">No data to plot yet</p>
          </div>
        )}
      </div>
    </PremiumCard>
  );
}

function RankRow({
  rank,
  title,
  meta,
  confidence,
}: {
  rank: number;
  title: string;
  meta: string;
  confidence?: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
          rank === 1
            ? "bg-amber-500/15 text-amber-500"
            : rank === 2
              ? "bg-muted/30 text-muted-foreground"
              : rank === 3
                ? "bg-amber-700/15 text-amber-700"
                : "bg-muted/20 text-muted-foreground/50"
        )}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-foreground/80">{title}</p>
        <p className="truncate text-[10px] text-muted-foreground/40">{meta}</p>
      </div>
      {confidence !== undefined && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-1 w-14 overflow-hidden rounded-full bg-muted/30">
            <div
              className={cn(
                "h-full rounded-full",
                confidence >= 0.8 ? "bg-success" : confidence >= 0.6 ? "bg-amber-500" : "bg-destructive"
              )}
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
          <span className="w-8 text-right font-mono text-[10px] text-muted-foreground/50">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeAnalyticsPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["knowledge-analytics"],
    queryFn: () => apiClient.get<MemoryAnalytics>("/memory/analytics"),
    staleTime: 60_000,
  });

  const charts = data?.charts;
  const hasGrowth = (charts?.memory_growth ?? []).some((d) => d.count > 0);
  const hasConfidence = (charts?.confidence_trend ?? []).some((d) => d.confidence !== null);
  const hasReuse = (charts?.strategy_reuse_trend ?? []).some((d) => d.reuses > 0);
  const hasTimeline = (charts?.timeline ?? []).some((d) => d.events > 0);
  const hasCategories = (charts?.category_distribution ?? []).length > 0;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-8 scrollbar-thin">
      <PageHeader
        kicker="Knowledge Center"
        title="Knowledge Analytics"
        description="How organizational memory is accumulating, how confident it is, and how often the system reuses it."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <EmptyState
          icon={<Brain className="h-12 w-12 text-muted-foreground/30" />}
          title="Failed to load analytics"
          description={(error as Error).message}
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            <StatCard
              icon={<Brain className="h-4 w-4" />}
              label="Total Memories"
              value={data?.total_memories ?? null}
              subtitle="persisted knowledge entries"
              delay={0}
            />
            <StatCard
              icon={<BookOpen className="h-4 w-4" />}
              label="Strategies"
              value={data?.total_strategies ?? null}
              subtitle="distinct strategies recorded"
              delay={0.04}
            />
            <StatCard
              icon={<Lightbulb className="h-4 w-4" />}
              label="Lessons"
              value={data?.total_lessons ?? null}
              subtitle="lessons learned across objectives"
              delay={0.08}
            />
            <StatCard
              icon={<Target className="h-4 w-4" />}
              label="Objectives"
              value={data?.total_objectives ?? null}
              subtitle="objectives with memory"
              delay={0.12}
            />
            <StatCard
              icon={<Scale className="h-4 w-4" />}
              label="Decisions"
              value={data?.total_decisions ?? null}
              subtitle="recorded executive decisions"
              delay={0.16}
            />
            <StatCard
              icon={<Zap className="h-4 w-4" />}
              label="Avg Confidence"
              value={data?.average_confidence ?? null}
              format="percent"
              subtitle="mean memory confidence"
              delay={0.2}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Avg Similarity"
              value={data?.average_similarity ?? null}
              format="percent"
              subtitle="avg nearest-neighbor score"
              delay={0.24}
            />
            <StatCard
              icon={<Repeat className="h-4 w-4" />}
              label="Reuse Rate"
              value={data?.reuse_rate ?? null}
              format="percent"
              subtitle={
                data?.planning_improvement != null && data.planning_improvement > 0
                  ? `+${(data.planning_improvement * 100).toFixed(1)}% confidence with memory`
                  : "memories reused by plans"
              }
              delay={0.28}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Memory Growth" description="Memories created per day over the last 30 days" hasData={hasGrowth}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.memory_growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} />
                  <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Memories"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Confidence Trend" description="Average memory confidence by creation date" hasData={hasConfidence}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts?.confidence_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} />
                  <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} domain={[0, 1]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    name="Avg confidence"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    connectNulls
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Strategy Reuse" description="Times a stored strategy was reused by a new plan" hasData={hasReuse}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.strategy_reuse_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} />
                  <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted-foreground) / 0.05)" }} />
                  <Bar dataKey="reuses" name="Reuses" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Activity Timeline" description="All memory lifecycle events per day" hasData={hasTimeline}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} />
                  <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="events"
                    name="Events"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.12)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Category distribution */}
          <div className="grid gap-6 lg:grid-cols-3">
            <PremiumCard variant="glass" className="p-5 lg:col-span-1" hoverEffect="glow">
              <SectionHeader title="Category Distribution" description="Memory categories by tag profile" />
              <div className="mt-4 h-[250px]">
                {hasCategories ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts?.category_distribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" horizontal={false} />
                      <XAxis type="number" tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke={AXIS_STROKE}
                        width={70}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted-foreground) / 0.05)" }} />
                      <Bar dataKey="value" name="Memories" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-xs text-muted-foreground/30">No categories yet</p>
                  </div>
                )}
              </div>
            </PremiumCard>

            <PremiumCard variant="glass" className="p-5 lg:col-span-2" hoverEffect="glow">
              <SectionHeader title="Most Used Strategies" description="Strategies ranked by reuse count and confidence" />
              <div className="mt-4 space-y-1">
                {(data?.most_used_strategies ?? []).length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground/30">No strategies recorded yet</p>
                ) : (
                  data?.most_used_strategies.slice(0, 8).map((s, i) => (
                    <RankRow
                      key={s.strategy}
                      rank={i + 1}
                      title={s.strategy}
                      meta={`${s.count} use${s.count === 1 ? "" : "s"} · last ${s.last_used ? new Date(s.last_used).toLocaleDateString() : "never"}`}
                      confidence={s.avg_confidence}
                    />
                  ))
                )}
              </div>
            </PremiumCard>
          </div>

          {/* Rankings */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PremiumCard variant="glass" className="p-5" hoverEffect="glow">
              <SectionHeader title="Highest Confidence" description="Objectives with the most trusted memories" />
              <div className="mt-4 space-y-1">
                {(data?.highest_confidence_objectives ?? []).length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground/30">No memories yet</p>
                ) : (
                  data?.highest_confidence_objectives.slice(0, 6).map((o, i) => (
                    <RankRow
                      key={o.memory_id}
                      rank={i + 1}
                      title={o.title}
                      meta={`${o.objective_id.slice(0, 8)}… · ${o.created_at ? new Date(o.created_at).toLocaleDateString() : ""}`}
                      confidence={o.confidence}
                    />
                  ))
                )}
              </div>
            </PremiumCard>

            <PremiumCard variant="glass" className="p-5" hoverEffect="glow">
              <SectionHeader title="Most Retrieved" description="Memories the planner references most often" />
              <div className="mt-4 space-y-1">
                {(data?.most_retrieved_memories ?? []).length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground/30">No retrievals recorded yet</p>
                ) : (
                  data?.most_retrieved_memories.slice(0, 6).map((o, i) => (
                    <RankRow
                      key={o.memory_id}
                      rank={i + 1}
                      title={o.title}
                      meta={`${o.usage_count} retrieval${o.usage_count === 1 ? "" : "s"} · ${o.objective_id.slice(0, 8)}…`}
                    />
                  ))
                )}
              </div>
            </PremiumCard>
          </div>

          {/* Top tags */}
          {(data?.top_tags ?? []).length > 0 && (
            <PremiumCard variant="glass" className="p-5" hoverEffect="glow">
              <SectionHeader title="Top Tags" description="Most frequent tags across the memory store" />
              <div className="mt-4 flex flex-wrap gap-2">
                {data?.top_tags.map((t) => (
                  <Badge key={t.tag} variant="outline" className="gap-1.5 py-1 text-[11px]">
                    <Layers className="h-3 w-3 text-primary/60" />
                    {t.tag}
                    <span className="text-muted-foreground/40">{t.count}</span>
                  </Badge>
                ))}
              </div>
            </PremiumCard>
          )}
        </>
      )}
    </div>
  );
}
