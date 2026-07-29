"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { ArrowRight } from "lucide-react";
import { PulseRing } from "@/components/premium/telemetry-viz";

export function ActiveExecution() {
  const phases = [
    { label: "Compile", done: true },
    { label: "Plan", done: true },
    { label: "Organize", done: true },
    { label: "Execute", done: false, active: true },
    { label: "Review", done: false },
  ];

  const progress = 62;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card p-6 transition-all duration-300 hover:border-border/80"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "radial-gradient(600px circle at 50% 0%, hsl(var(--primary) / 0.06), transparent 60%)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Active Execution</h2>
              <HealthBadge status="running" size="sm" />
            </div>
            <p className="mt-3 text-base font-medium leading-snug">
              E-commerce Platform Expansion
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Objective: Scale to 3 new markets with localized infrastructure
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PulseRing active color="hsl(var(--primary))" size={16} />
            <Link
              href="/execution"
              className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-all hover:bg-muted/50 active:scale-[0.98]"
            >
              Open Live View
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
            >
              <motion.div
                className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1">
          {phases.map((phase, i) => (
            <div key={phase.label} className="flex flex-1 items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className={`flex h-7 items-center justify-center rounded-full px-3 text-[10px] font-medium transition-all ${
                  phase.active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : phase.done
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {phase.label}
                {phase.active && (
                  <motion.span
                    className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary-foreground"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                {phase.done && !phase.active && (
                  <span className="ml-1.5">✓</span>
                )}
              </motion.div>
              {i < phases.length - 1 && (
                <div className="mx-1 h-px flex-1 bg-border/50" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Current Phase", value: "Execution" },
            { label: "Current Executive", value: "CTO" },
            { label: "Active Specialists", value: "3" },
            { label: "Est. Remaining", value: "~1.8s" },
          ].map((d) => (
            <div key={d.label}>
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {d.label}
              </div>
              <div className="mt-0.5 font-mono text-sm font-medium text-foreground">
                {d.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <ConfidenceBar value={0.76} label="Current Confidence" size="md" />
        </div>
      </div>
    </motion.section>
  );
}
