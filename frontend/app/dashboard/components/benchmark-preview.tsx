"use client";

import { motion } from "motion/react";
import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { BarChart3, TrendingUp, Target, Activity, ArrowUpRight } from "lucide-react";

export function BenchmarkPreview() {
  const { metrics } = useAggregateMetrics();

  const benchmarks = [
    { label: "Total Runs", value: metrics.totalRuns, icon: BarChart3, color: "text-sky-400", bg: "bg-sky-400/10", subtitle: "All-time", border: "border-sky-400/20" },
    { label: "Success Rate", value: metrics.successRate != null ? `${Math.round(metrics.successRate * 100)}%` : "\u2014", icon: Activity, color: metrics.successRate != null && metrics.successRate > 0.5 ? "text-emerald-400" : "text-amber-400", bg: metrics.successRate != null && metrics.successRate > 0.5 ? "bg-emerald-400/10" : "bg-amber-400/10", subtitle: "Completion rate", border: metrics.successRate != null && metrics.successRate > 0.5 ? "border-emerald-400/20" : "border-amber-400/20" },
    { label: "Avg. Confidence", value: metrics.avgConfidence != null ? `${Math.round(metrics.avgConfidence * 100)}%` : "\u2014", icon: Target, color: metrics.avgConfidence != null && metrics.avgConfidence > 0.7 ? "text-violet-400" : "text-amber-400", bg: metrics.avgConfidence != null && metrics.avgConfidence > 0.7 ? "bg-violet-400/10" : "bg-amber-400/10", subtitle: "Decision quality", border: metrics.avgConfidence != null && metrics.avgConfidence > 0.7 ? "border-violet-400/20" : "border-amber-400/20" },
  ];

  return (
    <div className="bento-tile p-6">
      <div className="relative z-[1]">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-xs font-semibold text-foreground/80">Aggregate Metrics</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {benchmarks.map((b) => {
            const Icon = b.icon;
            const isUp = b.label === "Total Runs" ? (b.value as number) > 0 : true;
            return (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, transition: { duration: 0.15 } }}
                className={`relative overflow-hidden rounded-xl border ${b.border} ${b.bg} p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[0_0_30px_-8px_hsl(var(--primary)/0.08)]`}
              >
                <motion.div
                  className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full border-2 border-current opacity-[0.15]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative z-[1]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="section-kicker text-muted-foreground/50">{b.label}</div>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md ${b.bg}`}>
                      <Icon className={`h-3 w-3 ${b.color}`} />
                    </div>
                  </div>
                  <div className={`font-mono text-xl font-bold tracking-tight ${b.color}`}>
                    {typeof b.value === "number" ? b.value.toLocaleString() : b.value}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    {isUp && (
                      <ArrowUpRight className={`h-3 w-3 ${b.color} opacity-50`} />
                    )}
                    <span className="text-[10px] text-muted-foreground/40">{b.subtitle}</span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: b.label === "Total Runs"
                          ? `${Math.min((b.value as number) / 100 * 100, 100)}%`
                          : b.label === "Success Rate"
                            ? `${Math.min((parseInt(b.value as string) || 0), 100)}%`
                            : `${Math.min((parseInt(b.value as string) || 0), 100)}%`
                      }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${b.color.replace("text-", "bg-")} opacity-40`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
