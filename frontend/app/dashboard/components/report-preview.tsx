"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import {
  useLatestObjectiveIdQuery,
  useReportQuery,
} from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

export function ReportPreview() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: report } = useReportQuery(objectiveId);

  return (
    <div className="bento-tile-accent p-5">
      <div className="relative z-[1]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <motion.div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10"
              whileHover={{ scale: 1.05 }}
            >
              <FileText className="h-4 w-4 text-primary" />
            </motion.div>
            <div>
              <h2 className="text-xs font-semibold text-foreground/80">
                Executive Report
              </h2>
              {report ? (
                <>
                  <h3 className="mt-1.5 text-sm font-medium text-foreground/80 line-clamp-1">
                    {report.objective_title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground/50 line-clamp-2">
                    {report.final_summary || `${report.executive_reports.length} executive report(s) available`}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className={cn(
                        "font-mono text-xs font-semibold tabular-nums",
                        report.health_score >= 80
                          ? "text-emerald-400"
                          : report.health_score >= 50
                            ? "text-amber-400"
                            : "text-red-400",
                      )}
                    >
                      {report.health_score}% health
                    </span>
                    <span className="text-xs text-muted-foreground/40">
                      {Math.round(report.confidence * 100)}% confidence
                    </span>
                    <span className="text-xs text-muted-foreground/40">
                      {report.recommendations.length} recommendations
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${report.health_score}%` }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className={cn(
                          "h-full rounded-full",
                          report.health_score >= 80
                            ? "bg-success"
                            : report.health_score >= 50
                              ? "bg-warning"
                              : "bg-destructive",
                        )}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<FileText className="h-4 w-4" />}
                  title="No report generated"
                  description="Executive summaries and health scores appear once a run finishes."
                  compact
                  className="mt-2"
                />
              )}
            </div>
          </div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded-lg border border-border/20 bg-secondary/50 px-3 py-1.5 text-[11px] font-medium text-secondary-foreground/70 transition-all hover:bg-muted/20 hover:text-foreground/60 active:scale-[0.98]"
          >
            Open
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
