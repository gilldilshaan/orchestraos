"use client";

import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { TelemetryMetric, TimelineEvent, PulseRing } from "@/components/premium/telemetry-viz";

export default function TelemetryPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Telemetry</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time event stream and observability data
            </p>
          </div>
          <HealthBadge status="running" />
        </div>
      </motion.div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <TelemetryMetric label="Events / sec" value="24" change={12} changeLabel="vs avg" />
        <TelemetryMetric label="Avg Latency" value="4.2ms" change={-8} changeLabel="improved" color="hsl(var(--success))" />
        <TelemetryMetric label="Error Rate" value="0.3%" change={-2} changeLabel="decreased" color="hsl(var(--success))" />
        <TelemetryMetric label="Queue Depth" value="7" change={3} changeLabel="increased" color="hsl(var(--warning))" />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2 rounded-xl border border-border/50 bg-card"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
            <h3 className="text-sm font-medium">Event Stream</h3>
            <div className="flex items-center gap-2">
              <PulseRing active color="hsl(var(--primary))" size={10} />
              <span className="text-[11px] text-muted-foreground">Live</span>
            </div>
          </div>
          <div className="h-96 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed scrollbar-thin">
            {[
              { t: "12:00:01.042", l: "INFO", m: "Telemetry bus initialized" },
              { t: "12:00:01.123", l: "INFO", m: "Organization creation started" },
              { t: "12:00:01.456", l: "EVENT", m: "organization_created { id: 'org_01j...' }" },
              { t: "12:00:01.789", l: "INFO", m: "CEO node created" },
              { t: "12:00:02.012", l: "EVENT", m: "task_started { task: 'ceo_analysis', node: 'ceo_01' }" },
              { t: "12:00:02.345", l: "INFO", m: "CEO analysis in progress" },
              { t: "12:00:03.101", l: "EVENT", m: "node_completed { node: 'ceo_01', duration: 1.09s }" },
              { t: "12:00:03.204", l: "INFO", m: "Organization generator started" },
              { t: "12:00:04.567", l: "EVENT", m: "executive_report { title: 'CTO', confidence: 0.92 }" },
              { t: "12:00:04.890", l: "EVENT", m: "executive_report { title: 'CFO', confidence: 0.88 }" },
              { t: "12:00:05.123", l: "INFO", m: "Specialist: ML Engineer assigned to CTO" },
              { t: "12:00:05.456", l: "EVENT", m: "specialist_report { title: 'ML Engineer', confidence: 0.91 }" },
              { t: "12:00:05.789", l: "EVENT", m: "node_retry { node: 'spec_03', attempt: 2 }" },
              { t: "12:00:06.012", l: "WARN", m: "Retry attempt 2/3 for Security Analyst" },
              { t: "12:00:06.345", l: "EVENT", m: "decision_created { id: 'dec_01', options: 3 }" },
            ].map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex gap-3 ${
                  entry.l === "EVENT"
                    ? "text-primary"
                    : entry.l === "WARN"
                      ? "text-warning"
                      : "text-muted-foreground"
                }`}
              >
                <span className="shrink-0 tabular-nums text-muted-foreground/60">
                  {entry.t}
                </span>
                <span className="shrink-0 w-10 font-semibold">[{entry.l}]</span>
                <span>{entry.m}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-border/50 bg-card">
            <div className="border-b border-border/50 px-5 py-3">
              <h3 className="text-sm font-medium">Filters</h3>
            </div>
            <div className="space-y-3 p-4">
              {["All Events", "Errors", "Retries", "Decisions", "Reports"].map(
                (f) => (
                  <label
                    key={f}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={f === "All Events"}
                      className="h-3.5 w-3.5 rounded border-border bg-muted text-primary focus:ring-primary/30"
                    />
                    {f}
                  </label>
                )
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="mb-3 text-sm font-medium">Recent Timeline</h3>
            <div className="space-y-0">
              <TimelineEvent title="Decision Created" timestamp="12:00:06" type="decision" description="3 options evaluated" active />
              <TimelineEvent title="Node Retry" timestamp="12:00:05" type="warning" description="Security Analyst attempt 2/3" />
              <TimelineEvent title="Specialist Done" timestamp="12:00:05" type="success" description="ML Engineer completed" />
              <TimelineEvent title="CEO Analysis" timestamp="12:00:03" type="info" description="Completed in 1.09s" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
