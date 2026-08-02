"use client";

import { useRecentRuns } from "@/hooks/use-dashboard";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { DataTable, DataTableRow, DataTableCell, TablePill } from "@/components/data-table";
import Link from "next/link";
import { ArrowRight, List } from "lucide-react";

export function RecentRuns() {
  const { runs } = useRecentRuns();

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <List className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">Recent Runs</span>
        </div>
        <Link
          href="/runs"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground/60"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="panel-body p-4">
        <DataTable headers={["Objective", "Runtime", "Confidence", "Nodes", "Status"]}>
          {runs.slice(0, 6).map((run) => (
            <DataTableRow key={run.id}>
              <DataTableCell className="max-w-[260px]">
                <div className="truncate font-medium text-foreground/80">
                  {run.objective}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/30">
                  {run.id.slice(0, 8)}...
                </div>
              </DataTableCell>
              <DataTableCell className="font-mono text-xs tabular-nums text-muted-foreground/60">
                {run.duration.toFixed(1)}s
              </DataTableCell>
              <DataTableCell>
                <ConfidenceBar value={run.confidence} size="sm" className="w-24" showValue />
              </DataTableCell>
              <DataTableCell>
                <TablePill>{run.node_count}</TablePill>
              </DataTableCell>
              <DataTableCell>
                <HealthBadge status={run.status} size="sm" />
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
        {runs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/30 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground/40">
              No runs yet. Start a new run to see data here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
