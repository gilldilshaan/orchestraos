"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { StatusBadge } from "@/components/status-badge";
import { AnimatedCounter } from "@/components/animated-counter";
import {
  useLatestObjectiveIdQuery,
  useObjectiveQuery,
  useReportQuery,
  useDashboardQuery,
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
  ArrowRight,
  Activity,
  HeartPulse,
  BrainCircuit,
  TrendingUp,
  ListTodo,
  CheckCircle2,
  Target,
} from "lucide-react";
import type { ExecutionStatus } from "@/types";
import Link from "next/link";

function mapDecisionStatus(status: string): ExecutionStatus {
  if (status === "APPROVED") return "completed";
  if (status === "REJECTED") return "failed";
  if (status === "UNDER_REVIEW") return "running";
  return "idle";
}

function ringColor(value: number): string {
  if (value >= 80) return "stroke-emerald-400";
  if (value >= 50) return "stroke-amber-400";
  return "stroke-red-400";
}

function ScoreRing({
  value,
  size = 96,
  stroke = 9,
  delay = 0.2,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  delay?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted/15"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
          className={ringColor(pct)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function GaugeCard({
  icon: Icon,
  label,
  value,
  sub,
  delay = 0,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number | null;
  sub?: string;
  delay?: number;
}) {
  const pct = value == null ? null : Math.round(value * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-4 rounded-xl border border-border/40 bg-card/40 p-4"
    >
      <ScoreRing value={pct ?? 0} delay={delay + 0.15}>
        <span
          className={cn(
            "font-mono text-lg font-bold tabular-nums",
            pct == null
              ? "text-muted-foreground/30"
              : pct >= 80
                ? "text-emerald-400"
                : pct >= 50
                  ? "text-amber-400"
                  : "text-red-400",
          )}
        >
          {pct == null ? "\u2014" : `${pct}%`}
        </span>
      </ScoreRing>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        {sub && (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground/50">
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function HealthBar({
  icon: Icon,
  label,
  value,
  invert = false,
  delay = 0,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number | null;
  invert?: boolean;
  delay?: number;
}) {
  const pct = value == null ? null : Math.max(0, Math.min(100, value * 100));
  const good = pct == null ? false : invert ? pct <= 40 : pct >= 60;
  const ok = pct == null ? false : invert ? pct <= 70 : pct >= 35;
  return (
    <div className="rounded-lg border border-border/30 bg-muted/20 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {label}
          </span>
        </div>
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums",
            pct == null
              ? "text-muted-foreground/30"
              : good
                ? "text-emerald-400"
                : ok
                  ? "text-amber-400"
                  : "text-red-400",
          )}
        >
          {pct == null ? "\u2014" : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct ?? 0}%` }}
          transition={{ duration: 0.8, delay: delay + 0.1, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "h-full rounded-full",
            pct == null
              ? "bg-muted/40"
              : good
                ? "bg-emerald-400/80"
                : ok
                  ? "bg-amber-400/80"
                  : "bg-red-400/80",
          )}
        />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Loading...
        </div>
      }
    >
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
  const { data: dashboard } = useDashboardQuery(objectiveId);

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

  const sh = dashboard?.system_health;
  const plan = dashboard?.plan;
  const org = dashboard?.organization;
  const readiness = dashboard?.business_readiness;
  const successProb = dashboard?.success_probability;
  const da = dashboard?.devils_advocate;
  const pendingDecisions = dashboard?.decisions?.pending_decisions ?? [];
  const riskLevels = (
    (report?.execution_metrics?.risk_levels as
      | Record<string, number>
      | undefined) ?? null
  );
  const pendingCount = report?.execution_metrics?.pending_decisions;

  const metrics: Array<{ key: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string }> = [
    { key: "plans", icon: ListTodo, color: "text-blue-400" },
    { key: "milestones", icon: Target, color: "text-violet-400" },
    { key: "risks", icon: ShieldAlert, color: "text-red-400" },
    { key: "decisions", icon: Scale, color: "text-indigo-400" },
    { key: "departments", icon: Building2, color: "text-emerald-400" },
  ];

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
                  {report.source === "kernel"
                    ? "AI Kernel Engine"
                    : "Synthesized from Pipeline"}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {objective?.raw_input ?? "Strategic execution report"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {generatedAt && (
              <span className="text-xs text-muted-foreground/60">
                {generatedAt}
              </span>
            )}
            {objective && <StatusBadge status={objective.status} size="sm" />}
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
          {/* Hero gauges */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <GaugeCard
              icon={Gauge}
              label="Health Score"
              value={report.health_score / 100}
              sub={
                riskLevels || pendingCount
                  ? `${riskLevels?.high ?? 0} high risk(s) · ${pendingCount ?? 0} pending`
                  : "Overall execution health"
              }
              delay={0.05}
            />
            <GaugeCard
              icon={Scale}
              label="Overall Confidence"
              value={report.confidence}
              sub="Average decision confidence"
              delay={0.1}
            />
            <GaugeCard
              icon={ShieldAlert}
              label="Risk Index"
              value={sh?.risk_index ?? null}
              sub={`${dashboard?.risks?.total ?? 0} risks · ${
                dashboard?.risks?.high ?? 0
              } high / ${dashboard?.risks?.critical ?? 0} critical`}
              delay={0.15}
            />
            <GaugeCard
              icon={TrendingUp}
              label="Success Probability"
              value={successProb?.success_probability ?? null}
              sub={
                successProb?.failure_risk != null
                  ? `${Math.round(successProb.failure_risk * 100)}% failure risk`
                  : "Model-estimated outcome odds"
              }
              delay={0.2}
            />
          </motion.div>

          {/* System health scoreboard */}
          {(sh?.execution_score != null ||
            sh?.coordination_score != null ||
            sh?.trust_score != null ||
            sh?.decision_quality != null) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border/40 bg-card p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-success" />
                <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground/60">
                  System Health Scoreboard
                </h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <HealthBar
                  icon={Activity}
                  label="Execution"
                  value={sh?.execution_score ?? null}
                  delay={0.1}
                />
                <HealthBar
                  icon={Building2}
                  label="Coordination"
                  value={sh?.coordination_score ?? null}
                  delay={0.15}
                />
                <HealthBar
                  icon={Scale}
                  label="Decision Quality"
                  value={sh?.decision_quality ?? null}
                  delay={0.2}
                />
                <HealthBar
                  icon={CheckCircle2}
                  label="Trust"
                  value={sh?.trust_score ?? null}
                  delay={0.25}
                />
                <HealthBar
                  icon={Target}
                  label="Readiness"
                  value={sh?.business_readiness_score ?? null}
                  delay={0.3}
                />
              </div>
            </motion.div>
          )}

          {/* Final summary + recommendations */}
          <div className="grid gap-4 lg:grid-cols-5">
            {report.final_summary && (
              <Section
                icon={ScrollText}
                title="Final Summary"
                color="text-primary"
                className="lg:col-span-3"
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {report.final_summary}
                </p>
              </Section>
            )}

            {report.recommendations.length > 0 && (
              <Section
                icon={Lightbulb}
                title="Strategic Recommendations"
                color="text-amber-400"
                className="lg:col-span-2"
              >
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
          </div>

          {/* Plan + organization progress */}
          <div className="grid gap-4 lg:grid-cols-2">
            {plan && (
              <Section
                icon={ListTodo}
                title="Plan Progress"
                color="text-violet-400"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground/85">
                      {plan.name ?? "Execution plan"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                      v{plan.plan_version} · {plan.status ?? "planned"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-bold tabular-nums text-foreground/85">
                      {plan.progress_percent ?? 0}%
                    </div>
                    <div className="text-[10px] text-muted-foreground/60">
                      {plan.completed_milestones}/{plan.milestone_count} milestones
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${plan.progress_percent ?? 0}%` }}
                    transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-violet-400/80"
                  />
                </div>
                {plan.confidence != null && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/50">
                      Plan confidence
                    </span>
                    <div className="w-24">
                      <ConfidenceBar value={plan.confidence} size="sm" />
                    </div>
                  </div>
                )}
              </Section>
            )}

            {org && org.departments.length > 0 && (
              <Section
                icon={Building2}
                title="Organization Overview"
                color="text-emerald-400"
              >
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
                    <div className="font-mono text-xl font-bold tabular-nums text-foreground/85">
                      {org.departments.length}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60">
                      Departments
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
                    <div className="font-mono text-xl font-bold tabular-nums text-foreground/85">
                      {org.total_head_count ?? 0}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60">
                      Head Count
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
                    <div
                      className={cn(
                        "font-mono text-xl font-bold tabular-nums",
                        (org.health_score ?? 0) >= 0.8
                          ? "text-emerald-400"
                          : (org.health_score ?? 0) >= 0.5
                            ? "text-amber-400"
                            : "text-red-400",
                      )}
                    >
                      {org.health_score != null
                        ? `${Math.round(org.health_score * 100)}%`
                        : "\u2014"}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60">
                      Health
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {org.departments.slice(0, 6).map((d) => (
                    <span
                      key={d.name}
                      className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {d.name} · {d.head_count}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Decisions + devil's advocate */}
          <div className="grid gap-4 lg:grid-cols-2">
            {(pendingDecisions.length > 0 || report.execution_metrics?.decisions) && (
              <Section
                icon={Scale}
                title="Decision Intelligence"
                color="text-indigo-400"
                action={
                  <Link
                    href="/decisions"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground/80"
                  >
                    Decision Center
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              >
                {pendingDecisions.length > 0 ? (
                  <div className="space-y-2">
                    {pendingDecisions.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/30 bg-muted/20 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground/80">
                            {d.title}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/60">
                            {d.recommendation}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <ConfidenceBar value={d.confidence} size="sm" />
                          <HealthBadge status="running" type="status" size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/20 p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success/70" />
                    <p className="text-xs text-muted-foreground/70">
                      No decisions pending review — all resolved.
                    </p>
                  </div>
                )}
                {report.execution_metrics?.decisions != null && (
                  <p className="mt-2 text-[11px] text-muted-foreground/50">
                    {String(report.execution_metrics.decisions)} decision(s) recorded in
                    this run
                  </p>
                )}
              </Section>
            )}

            {da && (
              <Section
                icon={BrainCircuit}
                title="Devil's Advocate Review"
                color="text-fuchsia-400"
              >
                <div className="flex items-center gap-4">
                  <ScoreRing
                    value={
                      da.critique_score != null
                        ? Math.round(da.critique_score * 100)
                        : 0
                    }
                    size={72}
                    stroke={7}
                    delay={0.25}
                  >
                    <span className="font-mono text-sm font-bold tabular-nums text-foreground/85">
                      {da.critique_score != null
                        ? `${Math.round(da.critique_score * 100)}%`
                        : "\u2014"}
                    </span>
                  </ScoreRing>
                  <p className="text-[11px] leading-relaxed text-muted-foreground/60">
                    Adversarial critique score — how strongly the strategy was
                    stress-tested before approval.
                  </p>
                </div>
                {da.recommendations && da.recommendations.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {da.recommendations.slice(0, 4).map((r: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400/60" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}
          </div>

          {/* Risk register */}
          {(dashboard?.risks?.top_risks?.length ?? 0) > 0 && (
            <Section
              icon={ShieldAlert}
              title={`Risk Register (${dashboard!.risks!.total})`}
              color="text-red-400"
              action={
                <Link
                  href="/risks"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground/80"
                >
                  View full register
                  <ArrowRight className="h-3 w-3" />
                </Link>
              }
            >
              <div className="space-y-2">
                {dashboard!.risks!.top_risks.map((risk, i) => {
                  const pct = Math.round((risk.probability ?? 0) * 100);
                  const impPct = Math.round((risk.impact ?? 0) * 100);
                  const derived = (risk.probability ?? 0) * (risk.impact ?? 0);
                  const score = risk.risk_score ?? derived;
                  return (
                    <motion.div
                      key={risk.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * i, duration: 0.3 }}
                      className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/20 p-3"
                    >
                      <HealthBadge
                        status={
                          risk.risk_level as "low" | "medium" | "high" | "critical"
                        }
                        type="risk"
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground/85">
                          {risk.title}
                        </p>
                        {risk.mitigation && (
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/70">
                            {risk.mitigation}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] uppercase text-muted-foreground/40">
                              p
                            </span>
                            <div className="h-1 w-14 overflow-hidden rounded-full bg-muted/40">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: 0.2 + i * 0.04 }}
                                className="h-full rounded-full bg-red-400/70"
                              />
                            </div>
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/50">
                              {pct}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] uppercase text-muted-foreground/40">
                              i
                            </span>
                            <div className="h-1 w-14 overflow-hidden rounded-full bg-muted/40">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${impPct}%` }}
                                transition={{ duration: 0.6, delay: 0.3 + i * 0.04 }}
                                className="h-full rounded-full bg-amber-400/70"
                              />
                            </div>
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/50">
                              {impPct}%
                            </span>
                          </div>
                          <span className="ml-auto rounded-md bg-red-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-red-400">
                            {score.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Conflicts */}
          {report.conflicts.length > 0 && (
            <Section
              icon={ShieldAlert}
              title={`Detected Conflicts (${report.conflicts.length})`}
              color="text-red-400"
            >
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
              icon={GitBranch}
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
                            <div className="space-y-4 border-t border-border/30 px-4 py-4">
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
                                                (a, b) => a + (b ?? 0),
                                                0,
                                              ).toLocaleString()}{" "}
                                              tok
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
                {metrics.map(({ key, icon: Icon, color }) => {
                  const raw = report.execution_metrics[key];
                  if (raw == null) return null;
                  const numeric =
                    typeof raw === "number"
                      ? raw
                      : typeof raw === "string" && !Number.isNaN(Number(raw))
                        ? Number(raw)
                        : null;
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-border/30 bg-muted/20 p-3"
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground",
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", color)} />
                        {key.replace(/_/g, " ")}
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground/80">
                        {numeric != null ? numeric.toLocaleString() : String(raw)}
                      </div>
                    </div>
                  );
                })}
                {riskLevels && (
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                      Risk Levels
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Object.entries(riskLevels).map(([level, count]) => (
                        <span
                          key={level}
                          className={cn(
                            "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                            level === "critical"
                              ? "bg-red-500/15 text-red-400"
                              : level === "high"
                                ? "bg-red-500/8 text-red-400/80"
                                : level === "medium"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-400",
                          )}
                        >
                          {level}:{count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pendingCount != null && (
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      <Scale className="h-3.5 w-3.5 text-indigo-400" />
                      Pending Decisions
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground/80">
                      {Number(pendingCount)}
                    </div>
                  </div>
                )}
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
  action,
  className,
  children,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  color: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("rounded-xl border border-border/40 bg-card p-5", className)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground/60">
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}
