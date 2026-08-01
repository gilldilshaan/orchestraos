"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { useObjectivesQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import {
  ExternalLink, RotateCcw, ArrowRightLeft,
  GitBranch, Building2, Radio, Scale, FolderOpen, LineChart,
} from "lucide-react";

function runtimeSeconds(createdAt: string | null, updatedAt: string | null, isTerminal: boolean): number {
  if (!createdAt) return 0;
  const start = new Date(createdAt).getTime();
  const end = isTerminal && updatedAt ? new Date(updatedAt).getTime() : Date.now();
  return Math.max(0, (end - start) / 1000);
}

export default function RunsPage() {
  const router = useRouter();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const { data: objectives } = useObjectivesQuery();

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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">
          Historical Runs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Past execution runs and their results
        </p>
      </motion.div>

      {runs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No runs yet. Start a new run to see execution history.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-lg border border-border/50 bg-card"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Objective
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Duration
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Confidence
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {runs.map((run, i) => (
                  <motion.tr
                    key={run.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium line-clamp-1">{run.objective}</div>
                      <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                        {run.id.slice(0, 12)}... &middot; {run.date ? new Date(run.date).toLocaleDateString() : "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums text-muted-foreground text-sm">
                      {run.duration.toFixed(1)}s
                    </td>
                    <td className="px-5 py-3.5 text-right">
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
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <HealthBadge status={run.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
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
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
