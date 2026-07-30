"use client";

import { useAggregateMetrics } from "@/hooks/use-dashboard";
import { AnimatedCounter } from "@/components/animated-counter";
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
} from "lucide-react";

const cardColors = [
  { icon: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/20", gradient: "from-sky-400/5", hue: "sky" },
  { icon: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", gradient: "from-emerald-400/5", hue: "emerald" },
  { icon: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", gradient: "from-amber-400/5", hue: "amber" },
  { icon: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20", gradient: "from-violet-400/5", hue: "violet" },
  { icon: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20", gradient: "from-rose-400/5", hue: "rose" },
  { icon: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20", gradient: "from-cyan-400/5", hue: "cyan" },
  { icon: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20", gradient: "from-orange-400/5", hue: "orange" },
  { icon: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20", gradient: "from-pink-400/5", hue: "pink" },
  { icon: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20", gradient: "from-indigo-400/5", hue: "indigo" },
];

const metricsConfig = [
  { icon: <PlayCircle className="h-4 w-4" />, label: "Total Runs", key: "totalRuns" as const, format: "number" as const, subtitle: "All-time across all organizations" },
  { icon: <CheckCircle2 className="h-4 w-4" />, label: "Success Rate", key: "successRate" as const, format: "percent" as const, subtitle: "Last 100 runs" },
  { icon: <Clock className="h-4 w-4" />, label: "Avg. Runtime", key: "avgRuntime" as const, format: "time" as const, subtitle: "Per execution" },
  { icon: <Users className="h-4 w-4" />, label: "Executives", key: "executivesSpawned" as const, format: "number" as const, subtitle: "Per run average" },
  { icon: <UserPlus className="h-4 w-4" />, label: "Specialists", key: "specialistsSpawned" as const, format: "number" as const, subtitle: "Per run average" },
  { icon: <Brain className="h-4 w-4" />, label: "Avg. Confidence", key: "avgConfidence" as const, format: "percent" as const, subtitle: "Decision quality" },
  { icon: <GitBranch className="h-4 w-4" />, label: "Parallelism", key: "parallelism" as const, format: "number" as const, subtitle: "Peak concurrent nodes" },
  { icon: <Heart className="h-4 w-4" />, label: "Health Score", key: "healthScore" as const, format: "percent" as const, subtitle: "Organization health" },
  { icon: <RotateCcw className="h-4 w-4" />, label: "Avg. Retries", key: "avgRetries" as const, format: "decimal" as const, subtitle: "Per node attempt" },
];

function MetricCard({
  icon,
  label,
  value,
  format,
  subtitle,
  colors,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  format: "number" | "percent" | "time" | "decimal";
  subtitle: string;
  colors: typeof cardColors[number];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, scale: 1.01, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-br ${colors.gradient} via-background/80 to-background/40 p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.1)]`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, hsl(var(--primary))/0.08)`, filter: "blur(25px)" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full border-2 border-current opacity-[0.15]"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative z-[1] flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`flex h-5 w-5 items-center justify-center rounded-md ${colors.bg}`}>
              {icon}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">{label}</span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground/90">
            {value != null ? (
              <AnimatedCounter value={value} format={format} />
            ) : (
              <span className="text-muted-foreground/30">&mdash;</span>
            )}
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground/35">{subtitle}</div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-current to-transparent opacity-20 transition-transform duration-500 group-hover:scale-x-100" />
    </motion.div>
  );
}

export function MetricGrid() {
  const { metrics } = useAggregateMetrics();
  const reduce = useReducedMotion();

  return (
    <section>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
            Runtime Metrics
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
        </div>
        <p className="text-center text-[11px] text-muted-foreground/40 mt-2">
          Aggregate performance across all executions
        </p>
      </motion.div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metricsConfig.map((cfg, i) => (
          <MetricCard
            key={cfg.label}
            icon={cfg.icon}
            label={cfg.label}
            value={metrics[cfg.key]}
            format={cfg.format}
            subtitle={cfg.subtitle}
            colors={cardColors[i % cardColors.length]}
            delay={reduce ? 0 : 0.05 + i * 0.03}
          />
        ))}
      </div>
    </section>
  );
}
