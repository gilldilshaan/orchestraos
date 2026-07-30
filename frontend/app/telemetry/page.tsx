"use client";

import { motion } from "motion/react";
import { useLatestObjectiveIdQuery, useTelemetryQuery, useTelemetrySummaryQuery, useEventsQuery } from "@/hooks/use-api";
import { MetricCard } from "@/components/metric-card";
import { Activity, CheckCircle2, XCircle, Clock, DollarSign, BarChart3, Cpu, Terminal } from "lucide-react";

export default function TelemetryPage() {
  const { data: objectiveId } = useLatestObjectiveIdQuery();
  const { data: telemetry, isLoading: telemetryLoading } = useTelemetryQuery(objectiveId);
  const { data: summary } = useTelemetrySummaryQuery(objectiveId);
  const { data: events } = useEventsQuery(objectiveId);

  const hasTelemetry = telemetry && telemetry.length > 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Agent Telemetry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-agent execution data, token usage, cost, and event timeline
        </p>
      </motion.div>

      {!objectiveId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">Create an objective first to see telemetry data.</p>
        </motion.div>
      )}

      {telemetryLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">Loading telemetry...</p>
        </motion.div>
      )}

      {objectiveId && !telemetryLoading && !hasTelemetry && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No telemetry records captured yet. Run an objective to populate agent telemetry.
          </p>
        </motion.div>
      )}

      {hasTelemetry && summary && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <MetricCard
              label="Total Agents"
              value={summary.total_agents}
              format="number"
              icon={<Activity className="h-4 w-4" />}
            />
            <MetricCard
              label="Completed"
              value={summary.completed}
              format="number"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <MetricCard
              label="Failed"
              value={summary.failed}
              format="number"
              icon={<XCircle className="h-4 w-4" />}
            />
            <MetricCard
              label="Total Cost"
              value={summary.total_cost > 0 ? `$${summary.total_cost.toFixed(6)}` : "—"}
              format="number"
              icon={<DollarSign className="h-4 w-4" />}
            />
            <MetricCard
              label="Total Tokens"
              value={summary.total_tokens}
              format="number"
              icon={<Cpu className="h-4 w-4" />}
            />
            <MetricCard
              label="Total Runtime"
              value={summary.total_runtime_ms > 0 ? `${(summary.total_runtime_ms / 1000).toFixed(1)}s` : "—"}
              format="number"
              icon={<Clock className="h-4 w-4" />}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-lg border border-border/50 bg-card"
          >
            <div className="border-b border-border/50 px-5 py-3.5">
              <h3 className="text-sm font-medium">Agent Execution Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Agent</th>
                    <th className="px-5 py-3 font-medium">Stage</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Model</th>
                    <th className="px-5 py-3 font-medium">Tokens</th>
                    <th className="px-5 py-3 font-medium">Cost</th>
                    <th className="px-5 py-3 font-medium">Runtime</th>
                    <th className="px-5 py-3 font-medium">Retries</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.map((t) => (
                    <tr key={t.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">{t.agent_name ?? t.agent_id}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.stage}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          t.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                          t.status === "failed" ? "bg-red-500/10 text-red-500" :
                          t.status === "running" ? "bg-blue-500/10 text-blue-500" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{t.model ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.total_tokens ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.total_cost != null ? `$${t.total_cost.toFixed(6)}` : "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.runtime_ms != null ? `${t.runtime_ms.toFixed(0)}ms` : "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{t.retries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {events && events.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-lg border border-border/50 bg-card"
            >
              <div className="border-b border-border/50 px-5 py-3.5">
                <h3 className="text-sm font-medium">Execution Event Timeline</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {events.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 border-b border-border/30 px-5 py-3 last:border-0">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      e.status === "completed" ? "bg-emerald-500" :
                      e.status === "failed" ? "bg-red-500" :
                      e.status === "running" ? "bg-blue-500" :
                      "bg-muted-foreground/30"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{e.stage}</span>
                        <span className={`text-[10px] uppercase ${
                          e.status === "completed" ? "text-emerald-500" :
                          e.status === "failed" ? "text-red-500" :
                          "text-muted-foreground"
                        }`}>{e.status}</span>
                        {e.progress > 0 && (
                          <span className="text-[10px] text-muted-foreground">{Math.round(e.progress * 100)}%</span>
                        )}
                      </div>
                      {e.message && (
                        <p className="text-xs text-muted-foreground truncate">{e.message}</p>
                      )}
                    </div>
                    {e.created_at && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(e.created_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
