"use client";

import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { PremiumMetricCard } from "@/components/premium-metric-card";
import { useHealthAiQuery } from "@/hooks/use-api";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { motion } from "motion/react";
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
  Cpu,
  Database,
  Zap,
} from "lucide-react";

const tones = [
  "hsl(217 80% 58%)",
  "hsl(158 62% 42%)",
  "hsl(263 72% 62%)",
  "hsl(38 88% 52%)",
  "hsl(199 72% 52%)",
  "hsl(326 74% 58%)",
  "hsl(20 78% 55%)",
  "hsl(158 62% 42%)",
  "hsl(0 72% 55%)",
  "hsl(263 72% 62%)",
  "hsl(199 72% 52%)",
  "hsl(326 74% 58%)",
] as const;

const metricsConfig = [
  {
    icon: <PlayCircle className="h-4 w-4" />,
    label: "Total Runs",
    key: "totalRuns" as const,
    format: "number" as const,
    subtitle: "All-time across all organizations",
  },
  {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Success Rate",
    key: "successRate" as const,
    format: "percent" as const,
    subtitle: "Last 100 runs",
  },
  {
    icon: <Clock className="h-4 w-4" />,
    label: "Average Runtime",
    key: "avgRuntime" as const,
    format: "time" as const,
    subtitle: "Per execution",
  },
  {
    icon: <Users className="h-4 w-4" />,
    label: "Executives Spawned",
    key: "executivesSpawned" as const,
    format: "number" as const,
    subtitle: "Per run average",
  },
  {
    icon: <UserPlus className="h-4 w-4" />,
    label: "Specialists Spawned",
    key: "specialistsSpawned" as const,
    format: "number" as const,
    subtitle: "Per run average",
  },
  {
    icon: <Brain className="h-4 w-4" />,
    label: "Average Confidence",
    key: "avgConfidence" as const,
    format: "percent" as const,
    subtitle: "Decision quality score",
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    label: "Parallelism",
    key: "parallelism" as const,
    format: "number" as const,
    subtitle: "Peak concurrent nodes",
  },
  {
    icon: <Heart className="h-4 w-4" />,
    label: "Health Score",
    key: "healthScore" as const,
    format: "percent" as const,
    subtitle: "Organization health",
  },
  {
    icon: <RotateCcw className="h-4 w-4" />,
    label: "Average Retries",
    key: "avgRetries" as const,
    format: "decimal" as const,
    subtitle: "Per node attempt",
  },
  {
    icon: <Cpu className="h-4 w-4" />,
    label: "Kernel Calls",
    key: "kernelCalls" as const,
    format: "number" as const,
    subtitle: "Total LLM invocations",
  },
  {
    icon: <Database className="h-4 w-4" />,
    label: "Tokens Used",
    key: "tokensUsed" as const,
    format: "number" as const,
    subtitle: "Across all providers",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    label: "Cache Hit Rate",
    key: "cacheHitRate" as const,
    format: "percent" as const,
    subtitle: "Kernel prompt cache",
  },
];

export function MetricGrid() {
  const { metrics } = useAggregateMetrics();
  const { data: ai } = useHealthAiQuery();
  const reduce = useReducedMotion();

  const metricsWithKernel = {
    ...metrics,
    kernelCalls: ai?.kernel.total_calls ?? null,
    tokensUsed: ai?.kernel.tokens_used ?? null,
    cacheHitRate: ai?.kernel.cache_hit_rate ?? null,
  };

  return (
    <section>
      <motion.div
        className="mb-4"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-sm font-semibold tracking-tight text-foreground/80">
          Runtime Metrics
        </h2>
        <p className="text-xs text-muted-foreground/50 mt-0.5">
          Aggregate performance across all executions
        </p>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metricsConfig.map((cfg, i) => (
          <PremiumMetricCard
            key={cfg.label}
            icon={cfg.icon}
            label={cfg.label}
            value={metricsWithKernel[cfg.key]}
            format={cfg.format}
            subtitle={cfg.subtitle}
            delay={0.05 + i * 0.03}
            tone={tones[i % tones.length]}
          />
        ))}
      </div>
    </section>
  );
}
