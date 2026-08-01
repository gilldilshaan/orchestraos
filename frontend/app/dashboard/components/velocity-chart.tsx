"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useChartDataQuery } from "@/hooks/use-api";
import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { Activity } from "lucide-react";
import { EmptyState } from "./empty-state";

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "11px",
  color: "hsl(var(--foreground))",
  boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
};

export function VelocityChart() {
  const { data: chart } = useChartDataQuery();
  const { metrics } = useAggregateMetrics();

  const data = useMemo(() => {
    if (chart?.runtime_over_time?.length) {
      return chart.runtime_over_time.slice(-14).map((d) => ({
        label: d.date.length >= 10 ? d.date.slice(5) : d.date,
        runs: d.run_count,
        runtime: d.average_runtime_seconds ?? null,
      }));
    }
    return [];
  }, [chart]);

  const hasData = data.some((d) => d.runs > 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">Execution Velocity</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/40">
            {metrics.totalRuns} total runs
          </span>
          <span className="font-mono text-[10px] tabular-nums text-success/70">
            {metrics.successRate != null ? `${Math.round(metrics.successRate * 100)}%` : "\u2014"} success
          </span>
        </div>
      </div>
      <div className="panel-body">
        {!hasData ? (
          <EmptyState
            icon={<Activity className="h-4 w-4" />}
            title="No execution history yet"
            description="Runs across the last 14 days appear here once your first pipeline completes."
            hint="runs/day · avg runtime"
            className="h-[210px]"
          />
        ) : (
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="velocityArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border) / 0.35)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border) / 0.4)" }}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                  formatter={(value, name) =>
                    name === "Avg. runtime"
                      ? [`${Number(value).toFixed(1)}s`, name]
                      : [String(value), name]
                  }
                />
                <Bar dataKey="runs" name="Runs" fill="hsl(var(--primary) / 0.45)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Area
                  type="monotone"
                  dataKey="runtime"
                  name="Avg. runtime"
                  stroke="hsl(190 91% 60%)"
                  strokeWidth={1.5}
                  fill="url(#velocityArea)"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
