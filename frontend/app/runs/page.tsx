"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/skeleton";
import { DataTable, DataTableRow, DataTableCell } from "@/components/data-table";
import { PremiumMetricCard } from "@/components/premium-metric-card";
import { useObjectivesQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import {
  ExternalLink, RotateCcw, ArrowRightLeft, History,
  GitBranch, Building2, Radio, Scale, FolderOpen, LineChart,
  PlayCircle, CheckCircle2, Brain, Clock,
} from "lucide-react";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

function runtimeSeconds(createdAt: string | null, updatedAt: string | null, isTerminal: boolean): number {
  if (!createdAt) return 0;
  const start = new Date(createdAt).getTime();
  const end = isTerminal && updatedAt ? new Date(updatedAt).getTime() : Date.now();
  return Math.max(0, (end - start) / 1000);
}

export default function RunsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>("all");
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const { data: objectives, isLoading } = useObjectivesQuery();

  const navigateTo = (path: string, id: string) => {
    setActiveObjectiveId(id);
    router.push(`${path}?id=${id}`);
  };

  const TERMINAL_STATES = new Set(["completed", "failed", "cancelled"]);
  const runs = (objectives ?? []).map((o) => {
    const objStatus = o.status ?? "";
    const isTerminal = TERMINAL_STATES.has(objStatus);
    return {
      id: o.id ?? "—",
      objective: o.raw_input ?? "—",
      date: o.created_at ?? null,
      duration: runtimeSeconds(o.created_at ?? null, o.updated_at ?? null, isTerminal),
      confidence: o.confidence ?? null,
      status: objStatus === "completed" ? "completed" as const : objStatus === "failed" ? "failed" as const : "running" as const,
    };
  });

  const filtered = filter === "all" ? runs : runs.filter((r) => r.status === filter);
  const completed = runs.filter((r) => r.status === "completed").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const running = runs.filter((r) => r.status === "running").length;
  const avgConfidence = runs.length
    ? runs.reduce((a, r) => a + (r.confidence ?? 0), 0) / runs.length
    : null;
  const avgDuration = runs.length ? runs.reduce((a, r) => a + r.duration, 0) / runs.length : null;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Data"
        title="Historical Runs"
        description="Past execution runs and their results"
      />

      {!isLoading && runs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PremiumMetricCard
            icon={<PlayCircle className="h-4 w-4" />}
            label="Total Runs"
            value={runs.length}
            subtitle={`${running} running now`}
            tone="hsl(217 80% 58%)"
          />
          <PremiumMetricCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Completed"
            value={completed}
            subtitle={failed > 0 ? `${failed} failed` : "no failures"}
            tone="hsl(158 62% 42%)"
          />
          <PremiumMetricCard
            icon={<Brain className="h-4 w-4" />}
            label="Avg. Confidence"
            value={avgConfidence != null ? Math.round(avgConfidence * 100) : null}
            format="percent"
            subtitle="across all runs"
            tone="hsl(263 72% 62%)"
          />
          <PremiumMetricCard
            icon={<Clock className="h-4 w-4" />}
            label="Avg. Duration"
            value={avgDuration != null ? Math.round(avgDuration) : null}
            format="time"
            subtitle="per execution"
            tone="hsl(38 88% 52%)"
          />
        </div>
      )}

      {!isLoading && runs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const count =
              f.value === "all" ? runs.length : f.value === "running" ? running : f.value === "completed" ? completed : failed;
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/20 bg-transparent text-muted-foreground/60 hover:bg-muted/20"
                }`}
              >
                {f.label}
                <span className={`font-mono tabular-nums ${active ? "text-primary/70" : "text-muted-foreground/40"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-border/30 bg-card p-5">
          <TableSkeleton rows={6} cols={5} />
        </div>
      )}

      {!isLoading && runs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <EmptyState
            icon={<History className="h-5 w-5" />}
            title="No runs yet"
            description="Start a new run to see execution history."
          />
        </motion.div>
      ) : !isLoading && filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <EmptyState
            icon={<History className="h-5 w-5" />}
            title={`No ${filter} runs`}
            description="Try a different status filter or start a new run."
          />
        </motion.div>
      ) : (
        !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-lg border border-border/50 bg-card"
        >
          <div className="p-5">
            <DataTable
              headers={[
                "Objective",
                <span key="duration" className="block text-right">Duration</span>,
                <span key="confidence" className="block text-right">Confidence</span>,
                <span key="status" className="block text-right">Status</span>,
                <span key="actions" className="block text-right">Actions</span>,
              ]}
            >
              {filtered.map((run) => (
                <DataTableRow key={run.id}>
                  <DataTableCell>
                    <div className="text-sm font-medium line-clamp-1">{run.objective}</div>
                    <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                      {run.id.slice(0, 12)}... &middot; {run.date ? new Date(run.date).toLocaleDateString() : "—"}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-right font-mono tabular text-muted-foreground text-sm">
                    {run.duration.toFixed(1)}s
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    {run.confidence != null ? (
                      <ConfidenceBar
                        value={run.confidence}
                        size="sm"
                        className="w-20 ml-auto"
                        showValue
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <HealthBadge status={run.status} size="sm" />
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigateTo("/execution", run.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Mission Control"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigateTo("/replay", run.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Replay"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigateTo("/graph", run.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Execution Graph"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigateTo("/organization", run.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Organization"
                      >
                        <Building2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigateTo("/telemetry", run.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Telemetry"
                      >
                        <Radio className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigateTo("/decisions", run.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Decision Center"
                      >
                        <Scale className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigateTo("/artifacts", run.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Artifacts"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigateTo("/analytics", run.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Analytics"
                      >
                        <LineChart className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => router.push(`/diff?id1=${run.id}`)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                        title="Compare"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTable>
          </div>
        </motion.div>
        )
      )}
    </div>
  );
}
