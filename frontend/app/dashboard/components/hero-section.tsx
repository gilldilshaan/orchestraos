"use client";

import { useState, useId } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useSystemHealth, useAggregateMetrics } from "@/hooks/use-dashboard";
import { useHealthAiQuery } from "@/hooks/use-api";
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
  Orbit,
  ArrowUpRight,
  Cpu,
  Gauge,
} from "lucide-react";

const ORBS = [
  { color: "rgba(99, 102, 241, 0.15)", size: 400, x: 15, y: 10, delay: 0, duration: 14 },
  { color: "rgba(139, 92, 246, 0.10)", size: 300, x: 75, y: 80, delay: 1.5, duration: 18 },
  { color: "rgba(6, 182, 212, 0.12)", size: 500, x: 60, y: 25, delay: 3, duration: 12 },
  { color: "rgba(236, 72, 153, 0.08)", size: 350, x: 85, y: 70, delay: 4.5, duration: 16 },
];

function FloatingOrbs() {
  const id = useId();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{ width: orb.size, height: orb.size, background: orb.color }}
          initial={{ x: `${orb.x}%`, y: `${orb.y}%`, scale: 0.6, opacity: 0.5 }}
          animate={{
            x: [`${orb.x}%`, `${(orb.x + 25) % 100}%`, `${orb.x}%`],
            y: [`${orb.y}%`, `${(orb.y - 20 + 100) % 100}%`, `${orb.y}%`],
            scale: [0.6, 1.3, 0.6],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function MetricBadge({ label, value, subtitle, color = "text-foreground/80", icon: Icon }: { label: string; value: string; subtitle?: string; color?: string; icon: typeof Zap }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative overflow-hidden rounded-xl border border-border/20 bg-background/40 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-background/60 hover:shadow-[0_0_35px_-8px_hsl(var(--primary)/0.15)]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(220px circle at 50% 0%, hsl(var(--primary) / 0.07), transparent 70%)" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full border-2 border-primary/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
            {label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground/25 group-hover:text-primary/40 transition-colors duration-300" />
        </div>
        <span className={`block font-mono text-xl font-bold tracking-tight ${color}`}>
          {value}
        </span>
        {subtitle && (
          <span className="mt-1.5 block text-[10px] text-muted-foreground/40">{subtitle}</span>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px scale-x-0 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 transition-transform duration-500 group-hover:scale-x-100" />
    </motion.div>
  );
}

function DotGrid() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="currentColor" className="text-foreground" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-grid)" />
    </svg>
  );
}

export function HeroSection() {
  const [showNewRun, setShowNewRun] = useState(false);
  const { health } = useSystemHealth();
  const { metrics } = useAggregateMetrics();
  const { data: ai } = useHealthAiQuery();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-indigo-950/40 via-background to-background shadow-[0_0_60px_-20px_hsl(var(--primary)/0.08)]">
      <FloatingOrbs />
      <DotGrid />

      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: [
            "radial-gradient(800px circle at 30% 20%, hsla(238, 84%, 67%, 0.04), transparent 50%)",
            "radial-gradient(800px circle at 70% 40%, hsla(238, 84%, 67%, 0.06), transparent 50%)",
            "radial-gradient(800px circle at 30% 20%, hsla(238, 84%, 67%, 0.04), transparent 50%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent" />
      <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-primary/10 to-transparent" />

      <motion.div
        className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full border border-primary/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full border border-violet-500/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative px-10 py-14 md:py-20">
        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-start justify-between"
        >
          <div className="flex items-start gap-5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15">
              <Orbit className="h-6 w-6 text-primary" />
              <motion.div
                className="pointer-events-none absolute -inset-1 rounded-xl border border-primary/20"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                Command Center
              </h1>
              <p className="mt-2 text-sm text-muted-foreground/70 max-w-md leading-relaxed">
                Monitor and orchestrate your AI organization in real-time
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex items-center gap-2.5 rounded-full bg-success/8 px-4 py-2 text-xs font-medium text-success border border-success/15 shadow-[0_0_15px_-3px_hsl(var(--success)/0.15)]"
          >
            <PulseRing active color="hsl(var(--success))" size={8} />
            <span>System Operational</span>
          </motion.div>
        </motion.div>

        {/* Key metrics */}
        <motion.div
          className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          <MetricBadge
            label="AI Provider"
            value={ai?.provider ?? "\u2014"}
            subtitle={ai?.model ? `via ${ai.model}` : undefined}
            color="text-cyan-400"
            icon={Cpu}
          />
          <MetricBadge
            label="Model"
            value={ai?.model ?? "\u2014"}
            subtitle={ai?.kernel?.total_calls ? `${ai.kernel.total_calls} calls` : undefined}
            color="text-violet-400"
            icon={Sparkles}
          />
          <MetricBadge
            label="Avg. Confidence"
            value={metrics.avgConfidence != null ? `${Math.round(metrics.avgConfidence * 100)}%` : "\u2014"}
            subtitle={metrics.totalRuns ? `Across ${metrics.totalRuns} runs` : undefined}
            color={metrics.avgConfidence != null && metrics.avgConfidence > 0.7 ? "text-success" : "text-warning"}
            icon={BarChart3}
          />
          <MetricBadge
            label="Health Score"
            value={metrics.healthScore != null ? `${Math.round(metrics.healthScore * 100)}%` : "\u2014"}
            subtitle={metrics.successRate ? `${Math.round(metrics.successRate * 100)}% success` : undefined}
            color={metrics.healthScore != null && metrics.healthScore > 0.7 ? "text-success" : "text-warning"}
            icon={Activity}
          />
        </motion.div>

        {/* Quick actions + Status */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <motion.div
            className="flex flex-wrap gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <GlowButton onClick={() => setShowNewRun(true)} size="md" variant="primary">
              <Play className="h-4 w-4" />
              New Run
            </GlowButton>
            <Link
              href="/replay"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-gradient-to-br from-secondary/60 to-secondary/30 px-4 py-2.5 text-xs font-medium text-secondary-foreground/80 transition-all hover:bg-muted/30 hover:text-foreground hover:border-border/50 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.08)] active:scale-[0.98]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay
            </Link>
            <Link
              href="/execution"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-gradient-to-br from-secondary/60 to-secondary/30 px-4 py-2.5 text-xs font-medium text-secondary-foreground/80 transition-all hover:bg-muted/30 hover:text-foreground hover:border-border/50 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.08)] active:scale-[0.98]"
            >
              <Activity className="h-3.5 w-3.5" />
              Live View
            </Link>
            <Link
              href="/benchmarks"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-gradient-to-br from-secondary/60 to-secondary/30 px-4 py-2.5 text-xs font-medium text-secondary-foreground/80 transition-all hover:bg-muted/30 hover:text-foreground hover:border-border/50 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.08)] active:scale-[0.98]"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Benchmarks
            </Link>
          </motion.div>

          <motion.div
            className="flex items-center gap-5 text-[11px] text-muted-foreground/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <span className="flex items-center gap-1.5">
              <span className={`relative flex h-2 w-2`}>
                <span className={`absolute inline-flex h-full w-full rounded-full ${health.active_runs > 0 ? 'bg-primary animate-ping opacity-40' : ''}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${health.active_runs > 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              </span>
              {health.active_runs} active
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="h-3 w-3 text-muted-foreground/30" />
              Queue: {health.queue_depth}
            </span>
            <span className="flex items-center gap-1.5">
              <Gauge className="h-3 w-3 text-muted-foreground/30" />
              Uptime: {Math.floor(health.uptime / 3600)}h
            </span>
          </motion.div>
        </div>
      </div>

      <NewRunModal open={showNewRun} onClose={() => setShowNewRun(false)} />
    </section>
  );
}
