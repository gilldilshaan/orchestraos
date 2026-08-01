"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useObjectiveContextStore } from "@/store";
import { useLatestObjectiveIdQuery, useDashboardQuery } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { ShieldAlert, ArrowRight, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { EmptyState } from "./empty-state";

const LEVEL_STYLE: Record<string, { text: string; bg: string; bar: string }> = {
  critical: { text: "text-destructive", bg: "bg-destructive/10 border-destructive/20", bar: "bg-destructive" },
  high: { text: "text-destructive/80", bg: "bg-destructive/5 border-destructive/15", bar: "bg-destructive/70" },
  medium: { text: "text-warning", bg: "bg-warning/10 border-warning/20", bar: "bg-warning" },
  low: { text: "text-success/70", bg: "bg-success/5 border-success/15", bar: "bg-success/60" },
};

function LevelIcon({ level }: { level: string }) {
  if (level === "critical") return <AlertOctagon className="h-3 w-3" />;
  if (level === "high" || level === "medium") return <AlertTriangle className="h-3 w-3" />;
  return <Info className="h-3 w-3" />;
}

export function RiskOverview() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: dashboard } = useDashboardQuery(objectiveId);

  const risks = dashboard?.risks;
  const topRisks = risks?.top_risks ?? [];
  const hasData = (risks?.total ?? 0) > 0;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
            <ShieldAlert className="h-3.5 w-3.5 text-warning" />
          </div>
          <span className="panel-header-title">Risk Overview</span>
        </div>
        <Link
          href="/execution"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground/60"
        >
          Details
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="panel-body">
        {!hasData ? (
          <EmptyState
            icon={<ShieldAlert className="h-4 w-4" />}
            title="No risks identified yet"
            description="The risk agent flags high-probability threats for the active objective here."
            hint="probability × impact"
            className="h-[210px]"
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between rounded-lg border border-border/20 bg-background/30 px-3.5 py-3">
              <div>
                <div className="section-kicker">Total Risks</div>
                <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground/90">
                  {risks!.total}
                </div>
              </div>
              <div className="text-right">
                <div className="section-kicker">Top Severity</div>
                <div className="mt-1 text-xs font-medium">
                  {topRisks[0] ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
                        LEVEL_STYLE[topRisks[0].risk_level]?.bg,
                        LEVEL_STYLE[topRisks[0].risk_level]?.text
                      )}
                    >
                      <LevelIcon level={topRisks[0].risk_level} />
                      {topRisks[0].risk_level}
                    </span>
                  ) : (
                    "\u2014"
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {topRisks.slice(0, 4).map((risk, i) => {
                const style = LEVEL_STYLE[risk.risk_level] ?? LEVEL_STYLE.medium;
                return (
                  <motion.div
                    key={risk.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.05, duration: 0.3 }}
                    className="group flex items-center gap-2.5 rounded-lg border border-border/15 bg-background/20 px-3 py-2 transition-colors hover:border-border/35"
                  >
                    <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border", style.bg, style.text)}>
                      <LevelIcon level={risk.risk_level} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-foreground/70">{risk.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-muted/30">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((risk.probability ?? 0) * 100)}%` }}
                            transition={{ duration: 0.7, delay: 0.2 + i * 0.05 }}
                            className={cn("h-full rounded-full", style.bar)}
                          />
                        </div>
                        <span className="font-mono text-[9px] tabular-nums text-muted-foreground/40">
                          p={Math.round((risk.probability ?? 0) * 100)}%
                        </span>
                        <span className="ml-auto truncate font-mono text-[9px] text-muted-foreground/30">
                          {risk.impact}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
