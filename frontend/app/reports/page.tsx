"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { StatusBadge } from "@/components/status-badge";
import {
  useLatestObjectiveIdQuery,
  useObjectiveQuery,
  useReportQuery,
} from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { cn } from "@/lib/utils";
import {
  FileText,
  ChevronDown,
  ScrollText,
  ShieldAlert,
  Lightbulb,
  ListChecks,
  AlertTriangle,
  Gauge,
  Scale,
  GitBranch,
  Building2,
  History,
} from "lucide-react";
import type { ExecutionStatus } from "@/types";

function mapDecisionStatus(status: string): ExecutionStatus {
  if (status === "APPROVED") return "completed";
  if (status === "REJECTED") return "failed";
  if (status === "UNDER_REVIEW") return "running";
  return "idle";
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const urlId = searchParams.get("id");
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!urlId);
  const objectiveId = urlId ?? latestObjectiveId;
  const { data: report, isLoading } = useReportQuery(objectiveId);
  const { data: objective } = useObjectiveQuery(objectiveId);

  useEffect(() => {
    if (urlId) {
      setActiveObjectiveId(urlId);
    }
  }, [urlId, setActiveObjectiveId]);

  const [expandedExec, setExpandedExec] = useState<string | null>(null);

  const toggleExec = (id: string) => {
    setExpandedExec((prev) => (prev === id ? null : id));
  };

  const generatedAt = report?.generated_at
    ? new Date(report.generated_at).toLocaleString()
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">
                Executive Reports
              </h1>
              {report && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                    report.source === "kernel"
                      ? "bg-violet-500/10 text-violet-400"
                      : "bg-blue-500/10 text-blue-400",
                  )}
                >
                  {report.source === "kernel" ? "AI Kernel Engine" : "Synthesized from Pipeline"}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {objective?.raw_input ?? "Strategic execution report"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {generatedAt && (
              <span className="text-xs text-muted-foreground/60">{generatedAt}</span>
            )}
            {objective && (
              <StatusBadge status={objective.status} size="sm" />
            )}
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
            Loading report...
          </div>
        </div>
      ) : !report ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-10 text-center"
        >
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No report generated yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Run a full pipeline on an objective to produce the executive report.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Overview */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid gap-3 sm:grid-cols-3"
          >
            <div className="rounded-xl border border-border/40 bg-card/30 p-4">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" />
                Health Score
              </div>
              <div
                className={cn(
                  "mt-1.5 font-mono text-2xl font-bold tabular-nums",
                  report.health_score >= 80
                    ? "text-emerald-400"
                    : report.health_score >= 50
                      ? "text-amber-400"
                      : "text-red-400",
                )}
              >
                {report.health_score}%
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/30 p-4">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                <Scale className="h-3.5 w-3.5" />
                Overall Confidence
              </div>
              <div className="mt-2">
                <ConfidenceBar value={report.confidence} size="sm" />
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/30 p-4">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                Recommendations
              </div>
              <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-foreground/80">
                {report.recommendations.length}
              </div>
            </div>
          </motion.div>

          {/* Final summary */}
          {report.final_summary && (
            <Section icon={ScrollText} title="Final Summary" color="text-primary">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {report.final_summary}
              </p>
            </Section>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Section icon={Lightbulb} title="Strategic Recommendations" color="text-amber-400">
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-muted/20 p-3 text-sm text-muted-foreground"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/10 font-mono text-[10px] font-semibold text-amber-400">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Conflicts */}
          {report.conflicts.length > 0 && (
            <Section icon={ShieldAlert} title={`Detected Conflicts (${report.conflicts.length})`} color="text-red-400">
              <div className="space-y-2">
                {report.conflicts.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <HealthBadge
                        status={c.severity as "low" | "medium" | "high" | "critical"}
                        type="risk"
                        size="sm"
                      />
                      <span className="text-sm font-medium">{c.description}</span>
                    </div>
                    {c.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.sources.map((s, j) => (
                          <span
                            key={j}
                            className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Bottlenecks */}
          {report.bottlenecks.length > 0 && (
            <Section icon={AlertTriangle} title="Bottlenecks" color="text-orange-400">
              <ul className="space-y-1.5">
                {report.bottlenecks.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400/60" />
                    {b}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Executive reports */}
          {report.executive_reports.length > 0 && (
            <Section
              icon={Building2}
              title={`Executive Reports (${report.executive_reports.length})`}
              color="text-violet-400"
            >
              <div className="space-y-3">
                {report.executive_reports.map((er, i) => {
                  const isExpanded = expandedExec === er.executive_id;
                  const specialistCount = er.specialist_reports?.length ?? 0;
                  return (
                    <motion.div
                      key={er.executive_id ?? i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="overflow-hidden rounded-lg border border-border/40 bg-muted/10"
                    >
                      <button
                        onClick={() => toggleExec(er.executive_id)}
                        className="flex w-full items-center justify-between gap-4 p-4 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium">{er.executive_title}</h4>
                            {er.status && (
                              <HealthBadge
                                status={mapDecisionStatus(er.status)}
                                type="status"
                                size="sm"
                              />
                            )}
                          </div>
                          {er.execution_summary && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {er.execution_summary}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-4">
                            {specialistCount > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                {specialistCount} specialist report(s)
                              </span>
                            )}
                            {er.aggregated_findings.length > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                {er.aggregated_findings.length} finding(s)
                              </span>
                            )}
                            <div className="w-16">
                              <ConfidenceBar
                                value={er.confidence}
                                size="sm"
                                showValue={false}
                              />
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border/30 px-4 py-4 space-y-4">
                              {er.execution_summary && (
                                <div>
                                  <h5 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                                    Executive Summary
                                  </h5>
                                  <p className="text-sm leading-relaxed text-muted-foreground">
                                    {er.execution_summary}
                                  </p>
                                </div>
                              )}

                              {er.aggregated_findings.length > 0 && (
                                <div>
                                  <h5 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                                    Aggregated Findings
                                  </h5>
                                  <ul className="space-y-1">
                                    {er.aggregated_findings.map((f, j) => (
                                      <li
                                        key={j}
                                        className="flex items-start gap-2 text-sm text-muted-foreground"
                                      >
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/60" />
                                        {f}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {er.risks.length > 0 && (
                                <div>
                                  <h5 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                                    Risks
                                  </h5>
                                  <ul className="space-y-1">
                                    {er.risks.map((r, j) => (
                                      <li
                                        key={j}
                                        className="flex items-start gap-2 text-sm text-muted-foreground"
                                      >
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/60" />
                                        {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {specialistCount > 0 && (
                                <div>
                                  <h5 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                                    Specialist Reports
                                  </h5>
                                  <div className="space-y-2">
                                    {er.specialist_reports.map((sr, j) => (
                                      <div
                                        key={sr.specialist_id ?? j}
                                        className="rounded-lg border border-border/30 bg-card/40 p-3"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-xs font-medium">
                                            {sr.title}
                                          </span>
                                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                                            {sr.execution_time > 0 && (
                                              <span>{sr.execution_time.toFixed(1)}s</span>
                                            )}
                                            <span className="font-mono tabular-nums">
                                              {Object.values(sr.token_usage ?? {}).reduce(
                                                (a, b) => a + (b ?? 0), 0,
                                              ).toLocaleString()} tok
                                            </span>
                                            <ConfidenceBar
                                              value={sr.confidence}
                                              size="sm"
                                              showValue={false}
                                              className="w-12"
                                            />
                                          </div>
                                        </div>
                                        {sr.findings.length > 0 && (
                                          <ul className="mt-2 space-y-0.5">
                                            {sr.findings.map((f, k) => (
                                              <li
                                                key={k}
                                                className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                              >
                                                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400/50" />
                                                {f}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                        {sr.recommendations.length > 0 && (
                                          <ul className="mt-1.5 space-y-0.5">
                                            {sr.recommendations.map((r, k) => (
                                              <li
                                                key={k}
                                                className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                              >
                                                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400/50" />
                                                {r}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Execution results */}
          {report.results.length > 0 && (
            <Section icon={GitBranch} title="Execution Results" color="text-cyan-400">
              <div className="grid gap-2 sm:grid-cols-2">
                {report.results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/30 bg-muted/20 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{r.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground/70">
                        {r.role_type}
                      </p>
                    </div>
                    <StatusBadge status={r.status} size="sm" />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Execution metrics */}
          {Object.keys(report.execution_metrics).length > 0 && (
            <Section icon={History} title="Execution Metrics" color="text-emerald-400">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {Object.entries(report.execution_metrics).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-border/30 bg-muted/20 p-3"
                  >
                    <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground/80">
                      {typeof value === "object" && value !== null
                        ? Object.entries(value as Record<string, unknown>)
                            .map(([k, v]) => `${k}:${v}`)
                            .join(", ")
                        : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl border border-border/40 bg-card p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} />
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground/60">
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}
