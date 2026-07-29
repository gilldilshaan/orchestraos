"use client";

import { motion } from "motion/react";
import { MetricCard } from "@/components/metric-card";
import { BarChart3, TrendingUp, PieChart, Activity } from "lucide-react";

export default function MetricsPage() {
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
        <MetricCard label="Total Executions" value={847} format="number" icon={<BarChart3 className="h-4 w-4" />} />
        <MetricCard label="Avg Confidence" value={0.83} format="percent" trend="up" change="+1.2%" icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="Avg Tokens/Call" value={1247} format="number" icon={<PieChart className="h-4 w-4" />} />
        <MetricCard label="Active Nodes" value={18} format="number" icon={<Activity className="h-4 w-4" />} />
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
            <div className="mb-2 text-3xl">📊</div>
            <p>Charts powered by Recharts</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Runtime, confidence, and token usage trends
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
