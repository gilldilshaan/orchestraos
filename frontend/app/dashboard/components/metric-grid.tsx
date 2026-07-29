"use client";

import { useMetrics } from "@/hooks/use-dashboard";
import { PremiumMetricCard } from "@/components/premium-metric-card";
import {
  PlayCircle,
  CheckCircle2,
  Clock,
  Users,
  UserPlus,
  Brain,
  GitBranch,
  Heart,
  RotateCcw,
} from "lucide-react";

const metricsConfig = [
  {
    icon: <PlayCircle className="h-4 w-4" />,
    label: "Total Runs",
    key: "totalRuns" as const,
    format: "number" as const,
    trend: { value: "+12.4%", direction: "up" as const },
    subtitle: "All-time across all organizations",
  },
  {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Success Rate",
    key: "successRate" as const,
    format: "percent" as const,
    trend: { value: "+2.1%", direction: "up" as const },
    subtitle: "Last 100 runs",
  },
  {
    icon: <Clock className="h-4 w-4" />,
    label: "Average Runtime",
    key: "avgRuntime" as const,
    format: "time" as const,
    trend: { value: "-0.3s", direction: "down" as const },
    subtitle: "Per execution",
  },
  {
    icon: <Users className="h-4 w-4" />,
    label: "Executives Spawned",
    key: "executivesSpawned" as const,
    format: "number" as const,
    trend: { value: "+2", direction: "up" as const },
    subtitle: "Per run average",
  },
  {
    icon: <UserPlus className="h-4 w-4" />,
    label: "Specialists Spawned",
    key: "specialistsSpawned" as const,
    format: "number" as const,
    trend: { value: "+5", direction: "up" as const },
    subtitle: "Per run average",
  },
  {
    icon: <Brain className="h-4 w-4" />,
    label: "Average Confidence",
    key: "avgConfidence" as const,
    format: "percent" as const,
    trend: { value: "+1.8%", direction: "up" as const },
    subtitle: "Decision quality score",
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    label: "Parallelism",
    key: "parallelism" as const,
    format: "number" as const,
    trend: { value: "2.4x", direction: "up" as const },
    subtitle: "Peak concurrent nodes",
  },
  {
    icon: <Heart className="h-4 w-4" />,
    label: "Health Score",
    key: "healthScore" as const,
    format: "percent" as const,
    trend: { value: "+0.5%", direction: "up" as const },
    subtitle: "Organization health",
  },
  {
    icon: <RotateCcw className="h-4 w-4" />,
    label: "Average Retries",
    key: "avgRetries" as const,
    format: "decimal" as const,
    trend: { value: "-0.1", direction: "down" as const },
    subtitle: "Per node attempt",
  },
];

export function MetricGrid() {
  const { metrics } = useMetrics();

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">
          Runtime Metrics
        </h2>
        <p className="text-xs text-muted-foreground">
          Aggregate performance across all executions
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metricsConfig.map((cfg, i) => (
          <PremiumMetricCard
            key={cfg.label}
            icon={cfg.icon}
            label={cfg.label}
            value={metrics[cfg.key]}
            format={cfg.format}
            trend={cfg.trend}
            subtitle={cfg.subtitle}
            delay={0.05 + i * 0.03}
          />
        ))}
        {/* Empty cell for uneven grid */}
        <div className="hidden xl:block" />
      </div>
    </section>
  );
}
