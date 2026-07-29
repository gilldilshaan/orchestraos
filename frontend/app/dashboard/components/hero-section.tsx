"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useSystemHealth, useAggregateMetrics } from "@/hooks/use-dashboard";
import { useHealthAiQuery } from "@/hooks/use-api";
import { AiCoreScene } from "@/components/3d/scene-wrapper";
import { NewRunModal } from "@/components/new-run-modal";
import {
  Play,
  RotateCcw,
  Activity,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export function HeroSection() {
  const [showNewRun, setShowNewRun] = useState(false);
  const { health } = useSystemHealth();
  const { metrics } = useAggregateMetrics();
  const { data: ai } = useHealthAiQuery();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-primary/3 via-background to-background">
      {/* AI Core 3D */}
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 opacity-60 sm:h-80 sm:w-80 md:h-96 md:w-96">
        <AiCoreScene
          isExecuting={health.active_runs > 0}
          confidence={metrics.avgConfidence}
          intensity={0.5}
          compact
          className="h-full w-full"
        />
      </div>

      <div className="relative px-8 py-10 md:py-14">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1
              className="text-2xl font-semibold tracking-tight md:text-3xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            >
              Orchestra
              <span className="text-primary">OS</span>
            </motion.h1>
            <motion.p
              className="mt-1 text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: [0.32, 0.72, 0, 1] }}
            >
              Dynamic AI Organizations
            </motion.p>
          </div>
          <motion.div
            className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-success"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            System Operational
          </motion.div>
        </div>

        <motion.div
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
        >
          {[
            { label: "Provider", value: ai?.provider ?? "—", color: "text-primary" },
            { label: "Model", value: ai?.model ?? "—", color: "text-primary" },
            {
              label: "Avg. Confidence",
              value: `${Math.round(metrics.avgConfidence * 100)}%`,
              color: "text-success",
            },
            {
              label: "Health Score",
              value: `${Math.round(metrics.healthScore * 100)}%`,
              color: "text-success",
            },
          ].map((item) => (
            <motion.div
              key={item.label}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
              className="rounded-lg border border-border/30 bg-background/50 px-3 py-2 backdrop-blur-sm"
            >
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {item.label}
              </div>
              <div className={`mt-0.5 font-mono text-sm font-medium ${item.color}`}>
                {item.value}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-6 flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <button
            onClick={() => setShowNewRun(true)}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Play className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
            New Run
          </button>
          <Link
            href="/execution"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground transition-all hover:bg-muted/50 active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay Last Run
          </Link>
          <Link
            href="/execution"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground transition-all hover:bg-muted/50 active:scale-[0.98]"
          >
            <Activity className="h-3.5 w-3.5" />
            Live Execution
          </Link>
          <Link
            href="/benchmarks"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground transition-all hover:bg-muted/50 active:scale-[0.98]"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Benchmarks
          </Link>
        </motion.div>

        <motion.div
          className="mt-6 flex items-center gap-4 border-t border-border/20 pt-4 text-[11px] text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <span className="flex items-center gap-1.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-success"
              animate={health.active_runs > 0 ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {health.active_runs} active runs
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3" />
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
