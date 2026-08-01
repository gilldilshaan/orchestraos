"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useSystemHealth, useAggregateMetrics } from "@/hooks/use-dashboard";
import { useHealthAiQuery } from "@/hooks/use-api";
import { NewRunModal } from "@/components/new-run-modal";
import { PulseRing } from "@/components/premium/page-transition";
import { AnimatedCounter } from "@/components/animated-counter";
import {
  Play,
  RotateCcw,
  Activity,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  Cpu,
  Brain,
  Coins,
  DatabaseZap,
} from "lucide-react";

interface ActionButton {
  label: string;
  icon: typeof Play;
  onClick: () => void;
  variant: "primary";
}

interface ActionLink {
  label: string;
  icon: typeof Play;
  href: string;
}

const QUICK_ACTIONS: (ActionButton | ActionLink)[] = [
  { label: "New Run", icon: Play, onClick: () => {}, variant: "primary" },
  { label: "Replay", icon: RotateCcw, href: "/replay" },
  { label: "Live View", icon: Activity, href: "/execution" },
  { label: "Benchmarks", icon: BarChart3, href: "/benchmarks" },
];

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

interface HeroStat {
  label: string;
  value: number | null;
  format?: "number" | "percent" | "decimal";
  icon?: typeof Play;
  accent?: boolean;
  pulse?: boolean;
  tint?: string;
}

export function HeroSection() {
  const [showNewRun, setShowNewRun] = useState(false);
  const { health } = useSystemHealth();
  const { metrics } = useAggregateMetrics();
  const { data: ai } = useHealthAiQuery();
  const now = useClock();

  const stats: HeroStat[] = [
    {
      label: "Avg. Confidence",
      value: metrics.avgConfidence != null ? metrics.avgConfidence : null,
      format: "percent",
      accent: true,
      tint: "text-success",
    },
    {
      label: "Health Score",
      value: metrics.healthScore != null ? metrics.healthScore : null,
      format: "percent",
      accent: true,
      tint: "text-success",
    },
    {
      label: "Active Agents",
      value: (ai?.active_agents ?? 0) + (ai?.active_executives ?? 0) + (ai?.active_specialists ?? 0),
      icon: Brain,
    },
    {
      label: "Pending Tasks",
      value: ai?.pending_tasks ?? 0,
      icon: Activity,
      pulse: (ai?.pending_tasks ?? 0) > 0,
    },
    {
      label: "Kernel Calls",
      value: ai?.kernel.total_calls ?? 0,
      icon: Cpu,
    },
    {
      label: "Tokens Used",
      value: ai?.kernel.tokens_used ?? 0,
      icon: DatabaseZap,
    },
    {
      label: "Kernel Cost",
      value: ai?.kernel.total_cost ?? null,
      format: "decimal",
      icon: Coins,
    },
    {
      label: "Cache Hit",
      value: ai?.kernel.cache_hit_rate != null ? ai.kernel.cache_hit_rate : null,
      format: "percent",
      icon: Sparkles,
    },
  ];

  const aiAgents =
    (ai?.active_agents ?? 0) + (ai?.active_executives ?? 0) + (ai?.active_specialists ?? 0);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-primary/[0.05] via-background to-background">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 opacity-[0.08]">
        <div className="h-full w-full rounded-full bg-primary blur-3xl" />
      </div>
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 opacity-[0.06]">
        <div className="h-full w-full rounded-full bg-violet-500 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute right-1/3 top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-primary/[0.03] to-transparent" />

      <div className="relative px-8 py-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                Command Center
              </h1>
              <motion.div
                className="flex items-center gap-1.5 rounded-full bg-success/8 px-3 py-1 text-[11px] font-medium text-success/80"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <PulseRing active color="hsl(var(--success))" size={6} />
                <span>Operational</span>
              </motion.div>
              <motion.span
                className="hidden font-mono text-[11px] tabular-nums text-muted-foreground/35 lg:inline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {now ? now.toLocaleTimeString() : "\u2014"}
              </motion.span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Monitor and orchestrate your AI organization in real-time
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              if ("onClick" in action) {
                return (
                  <motion.button
                    key={action.label}
                    onClick={() => setShowNewRun(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all hover:bg-primary/90 active:scale-[0.97]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {action.label}
                  </motion.button>
                );
              }
              return (
                <Link
                  key={action.label}
                  href={action.href!}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/50 px-3.5 py-2 text-xs font-medium text-secondary-foreground/70 transition-all hover:bg-muted/30 hover:text-foreground active:scale-[0.97]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/20 bg-border/20 sm:grid-cols-4">
          {stats.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="group relative bg-card/40 px-4 py-3 transition-colors hover:bg-card/60"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
                  {item.label}
                </span>
                {item.icon ? (
                  <item.icon className="h-3 w-3 text-muted-foreground/20" />
                ) : (
                  <span className={item.tint ? `${item.tint}/40` : ""}>
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="mt-0.5">
                {item.value != null ? (
                  <AnimatedCounter
                    value={item.value}
                    format={item.format ?? "number"}
                    className={`text-sm font-medium tabular-nums ${item.accent ? "text-primary" : "text-foreground/70"}`}
                  />
                ) : (
                  <span className="font-mono text-sm text-muted-foreground/30">\u2014</span>
                )}
              </div>
              {item.pulse && (
                <motion.span
                  className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-warning"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/40">
          <span className="flex items-center gap-1.5">
            <PulseRing
              active={health.active_runs > 0}
              color={health.active_runs > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
              size={5}
            />
            {health.active_runs} active runs
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="h-3 w-3 text-muted-foreground/20" />
            Queue: {health.queue_depth}
          </span>
          <span>Uptime: {Math.floor(health.uptime / 3600)}h</span>
          <span className="hidden items-center gap-1.5 md:flex">
            <Sparkles className="h-3 w-3 text-muted-foreground/20" />
            {ai?.provider ?? "\u2014"} / {ai?.model ?? "\u2014"}
          </span>
          <span className="hidden font-mono text-muted-foreground/25 lg:inline">
            {aiAgents} agents online
          </span>
        </div>
      </div>

      <NewRunModal open={showNewRun} onClose={() => setShowNewRun(false)} />
    </section>
  );
}
