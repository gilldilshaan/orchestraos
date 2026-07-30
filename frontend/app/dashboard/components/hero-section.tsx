"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useSystemHealth, useAggregateMetrics } from "@/hooks/use-dashboard";
import { useHealthAiQuery } from "@/hooks/use-api";
import { AiCoreScene } from "@/components/3d/scene-wrapper";
import { NewRunModal } from "@/components/new-run-modal";
import { GlowButton } from "@/components/premium/premium-card";
import { PulseRing } from "@/components/premium/page-transition";
import {
  Play,
  RotateCcw,
  Activity,
  BarChart3,
  Sparkles,
  Zap,
  ArrowUpRight,
} from "lucide-react";

export function HeroSection() {
  const [showNewRun, setShowNewRun] = useState(false);
  const { health } = useSystemHealth();
  const { metrics } = useAggregateMetrics();
  const { data: ai } = useHealthAiQuery();

  const quickActions = [
    { label: "New Run", icon: Play, onClick: () => setShowNewRun(true), variant: "primary" as const },
    { label: "Replay", icon: RotateCcw, href: "/replay", variant: "secondary" as const },
    { label: "Live", icon: Activity, href: "/execution", variant: "secondary" as const },
    { label: "Benchmarks", icon: BarChart3, href: "/benchmarks", variant: "secondary" as const },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-b from-primary/[0.04] via-background to-background">
      {/* AI Core 3D */}
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 opacity-50 sm:h-80 sm:w-80 md:h-96 md:w-96">
        <AiCoreScene
          isExecuting={health.active_runs > 0}
          confidence={metrics.avgConfidence ?? undefined}
          intensity={0.4}
          compact
          className="h-full w-full"
        />
      </div>

      {/* Enterprise glow bar */}
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="relative px-8 py-10 md:py-14">
        <div className="flex items-start justify-between">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3">
                <motion.h1
                  className="text-2xl font-semibold tracking-tight md:text-3xl"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                >
                  Command Center
                </motion.h1>
              </div>
              <motion.p
                className="mt-1 text-sm text-muted-foreground/70 max-w-md"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05, ease: [0.32, 0.72, 0, 1] }}
              >
                Monitor and orchestrate your AI organization in real-time
              </motion.p>
            </motion.div>
          </div>
          <motion.div
            className="flex items-center gap-2 rounded-full bg-success/8 px-3 py-1.5 text-xs font-medium text-success/80 border border-success/10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <PulseRing active color="hsl(var(--success))" size={8} />
            <span>System Operational</span>
          </motion.div>
        </div>

        {/* Quick stats */}
        <motion.div
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {[
            { label: "Provider", value: ai?.provider ?? "—", color: "text-primary", icon: Sparkles },
            { label: "Model", value: ai?.model ?? "—", color: "text-primary", icon: Zap },
            {
              label: "Avg. Confidence",
              value: metrics.avgConfidence != null ? `${Math.round(metrics.avgConfidence * 100)}%` : "—",
              color: "text-success",
              icon: BarChart3,
            },
            {
              label: "Health Score",
              value: metrics.healthScore != null ? `${Math.round(metrics.healthScore * 100)}%` : "—",
              color: "text-success",
              icon: Activity,
            },
          ].map((item) => (
            <motion.div
              key={item.label}
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.97 },
                visible: {
                  opacity: 1, y: 0, scale: 1,
                  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-lg border border-border/20 bg-background/40 px-3 py-2.5 backdrop-blur-sm transition-all duration-200 hover:border-border/40 hover:bg-background/60"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: "radial-gradient(200px circle at 50% 0%, hsl(var(--primary) / 0.05), transparent 60%)",
                }}
              />
              <div className="relative flex items-center justify-between">
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/50">
                  {item.label}
                </div>
                <item.icon className="h-3 w-3 text-muted-foreground/20" />
              </div>
              <div className={`relative mt-0.5 font-mono text-sm font-medium ${item.color}`}>
                {item.value}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick actions */}
        <motion.div
          className="mt-6 flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            if ("onClick" in action && action.onClick) {
              return (
                <GlowButton key={action.label} onClick={action.onClick} size="sm" variant={action.variant}>
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </GlowButton>
              );
            }
            if ("href" in action && action.href) {
              return (
                <Link
                  key={action.label}
                  href={action.href!}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/50 px-4 py-2 text-xs font-medium text-secondary-foreground/80 transition-all hover:bg-muted/30 hover:text-foreground active:scale-[0.98]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </Link>
              );
            }
            return null;
          })}
        </motion.div>

        {/* System status bar */}
        <motion.div
          className="mt-6 flex items-center gap-4 border-t border-border/15 pt-4 text-[11px] text-muted-foreground/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <motion.span
            className="flex items-center gap-1.5"
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
          >
            <PulseRing
              active={health.active_runs > 0}
              color={health.active_runs > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
              size={6}
            />
            {health.active_runs} active runs
          </motion.span>
          <span className="flex items-center gap-1.5">
            <ArrowUpRight className="h-3 w-3 text-muted-foreground/30" />
            Queue: {health.queue_depth}
          </span>
          <span className="flex items-center gap-1.5">
            Uptime: {Math.floor(health.uptime / 3600)}h
          </span>
        </motion.div>
      </div>

      <NewRunModal open={showNewRun} onClose={() => setShowNewRun(false)} />
    </section>
  );
}
