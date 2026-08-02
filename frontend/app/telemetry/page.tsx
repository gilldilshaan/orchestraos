"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useLatestObjectiveIdQuery, useTelemetryQuery, useTelemetrySummaryQuery, useEventsQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton, MetricSkeleton, TableSkeleton } from "@/components/skeleton";
import { DataTable, DataTableRow, DataTableCell } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Activity, CheckCircle2, XCircle, Clock, DollarSign, BarChart3, Cpu, Terminal } from "lucide-react";

export default function TelemetryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TelemetryContent />
    </Suspense>
  );
}

function TelemetryContent() {
  const searchParams = useSearchParams();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const urlId = searchParams.get("id");
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!urlId);
  const objectiveId = urlId ?? latestObjectiveId;
  const { data: telemetry, isLoading: telemetryLoading } = useTelemetryQuery(objectiveId);
  const { data: summary } = useTelemetrySummaryQuery(objectiveId);
  const { data: events } = useEventsQuery(objectiveId);

  // Sync URL param to global execution context
  useEffect(() => {
    if (urlId) {
      setActiveObjectiveId(urlId);
    }
  }, [urlId, setActiveObjectiveId]);

  const hasTelemetry = telemetry && telemetry.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Analyze"
        title="Agent Telemetry"
        description="Per-agent execution data, token usage, cost, and event timeline"
      />

      {!objectiveId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EmptyState
            icon={<Terminal className="h-5 w-5" />}
            title="No execution selected"
            description="Run an objective or pick an execution from the sidebar to view its telemetry."
          />
        </motion.div>
      )}

      {telemetryLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <MetricSkeleton key={i} />
            ))}
          </div>
          <div className="rounded-xl border border-border/30 bg-card p-5">
            <TableSkeleton rows={6} cols={8} />
          </div>
        </div>
      )}

      {objectiveId && !telemetryLoading && !hasTelemetry && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="No telemetry for this execution"
            description="Agent telemetry will appear here once this objective produces run data."
          />
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
            <div className="p-5">
              <DataTable
                headers={["Agent", "Stage", "Status", "Model", "Tokens", "Cost", "Runtime", "Retries"]}
              >
                {telemetry.map((t) => (
                  <DataTableRow key={t.id}>
                    <DataTableCell className="font-medium text-foreground/90">
                      {t.agent_name ?? t.agent_id}
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      <span className="chip">{t.stage}</span>
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge status={t.status} size="sm" />
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      <span className="chip">{t.model ?? "—"}</span>
                    </DataTableCell>
                    <DataTableCell className="tabular text-muted-foreground">
                      {t.total_tokens ?? "—"}
                    </DataTableCell>
                    <DataTableCell className="tabular text-muted-foreground">
                      {t.total_cost != null ? `$${t.total_cost.toFixed(6)}` : "—"}
                    </DataTableCell>
                    <DataTableCell className="tabular text-muted-foreground">
                      {t.runtime_ms != null ? `${t.runtime_ms.toFixed(0)}ms` : "—"}
                    </DataTableCell>
                    <DataTableCell className="tabular text-muted-foreground">
                      {t.retries}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTable>
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
