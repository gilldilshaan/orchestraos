"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  useOperationsSummaryQuery,
} from "@/hooks/use-intelligence";
import { StatusBadge } from "@/components/status-badge";
import {
  Orbit,
  Bot,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Clock,
  DollarSign,
  Cpu,
  GitBranch,
  AlertTriangle,
  Gauge,
  Users,
  Play,
  Pause,
} from "lucide-react";

const METRICS = [
  { key: "active_objectives", label: "Active Objectives", icon: Orbit, format: "number" },
  { key: "running_agents", label: "Running Agents", icon: Bot, format: "number" },
  { key: "queue_depth", label: "Queue Depth", icon: Play, format: "number" },
  { key: "blocked_work_items", label: "Blocked Work Items", icon: Pause, format: "number" },
  { key: "pending_approvals", label: "Pending Approvals", icon: CheckCircle2, format: "number" },
  { key: "health_score", label: "Health Score", icon: Gauge, format: "percent" },
  { key: "success_rate", label: "Success Rate", icon: Activity, format: "percent" },
  { key: "active_risks", label: "Active Risks", icon: ShieldAlert, format: "number" },
  { key: "total_alerts", label: "Total Alerts", icon: AlertTriangle, format: "number" },
  { key: "pending_gates", label: "Pending Gates", icon: GitBranch, format: "number" },
  { key: "total_checkpoints", label: "Checkpoints", icon: Clock, format: "number" },
  { key: "total_healing_actions", label: "Healing Actions", icon: Activity, format: "number" },
  { key: "cost_today", label: "Cost Today", icon: DollarSign, format: "cost" },
  { key: "token_usage", label: "Token Usage", icon: Cpu, format: "number" },
];

function formatValue(key: string, value: number) {
  if (key === "health_score" || key === "success_rate") {
    return `${value}%`;
  }
  if (key === "cost_today") {
    return `$${value.toFixed(2)}`;
  }
  if (key === "token_usage") {
    return value.toLocaleString();
  }
  return String(value);
}

function getStatusColor(key: string, value: number): string {
  if (key === "health_score") {
    return value >= 80 ? "text-emerald-400" : value >= 50 ? "text-amber-400" : "text-red-400";
  }
  if (key === "success_rate") {
    return value >= 80 ? "text-emerald-400" : value >= 50 ? "text-amber-400" : "text-red-400";
  }
  if (key === "active_risks" || key === "total_alerts") {
    return value > 0 ? "text-red-400" : "text-emerald-400";
  }
  if (key === "blocked_work_items" || key === "pending_approvals" || key === "pending_gates") {
    return value > 0 ? "text-amber-400" : "text-muted-foreground";
  }
  return "text-foreground/80";
}

export default function OperationsPage() {
  const { data: summary, isLoading } = useOperationsSummaryQuery();

  const healthColor = useMemo(() => {
    if (!summary) return "text-muted-foreground";
    return summary.health_score >= 80 ? "text-emerald-400" : summary.health_score >= 50 ? "text-amber-400" : "text-red-400";
  }, [summary]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Executive Operations Center</h1>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              Real-time overview of all active objectives, agents, and system health
            </p>
          </div>
          {summary && (
            <StatusBadge
              status={summary.health_score >= 80 ? "completed" : summary.health_score >= 50 ? "running" : "failed"}
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
              Loading operations data...
            </div>
          </div>
        ) : !summary ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No operations data available
          </div>
        ) : (
          <div className="space-y-8 p-6">
            {/* Health Banner */}
            <div className={cn(
              "rounded-xl border p-4",
              summary.health_score >= 80
                ? "border-emerald-500/20 bg-emerald-500/5"
                : summary.health_score >= 50
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-red-500/20 bg-red-500/5",
            )}>
              <div className="flex items-center gap-3">
                <Gauge className={cn("h-6 w-6", healthColor)} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">System Health</span>
                    <span className={cn("font-mono text-2xl font-bold tabular-nums", healthColor)}>
                      {summary.health_score}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {summary.health_score >= 80
                      ? "All systems operating normally"
                      : summary.health_score >= 50
                        ? "Some issues detected — review alerts below"
                        : "Critical: immediate attention required"}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Bar */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Active Objectives:</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{summary.active_objectives}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                <Bot className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-muted-foreground">Running Agents:</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{summary.running_agents}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Unresolved Alerts:</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{summary.total_alerts}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Success Rate:</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{summary.success_rate}%</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                All Metrics
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {METRICS.map((metric) => {
                  const value = (summary as unknown as Record<string, number>)[metric.key] ?? 0;
                  const Icon = metric.icon;
                  return (
                    <motion.div
                      key={metric.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border/40 bg-card/30 p-4 hover:border-border/60 hover:bg-card/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {metric.label}
                      </div>
                      <div className={cn(
                        "mt-1.5 font-mono text-xl font-bold tabular-nums",
                        getStatusColor(metric.key, value),
                      )}>
                        {formatValue(metric.key, value)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
