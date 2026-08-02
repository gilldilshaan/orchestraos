"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  useDashboardQuery,
  useLatestObjectiveIdQuery,
  useObjectiveQuery,
} from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/skeleton";
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Info,
  Target,
  User,
  Boxes,
  ShieldCheck,
  LifeBuoy,
  ChevronDown,
  Gauge,
} from "lucide-react";

const LEVEL_ORDER = ["critical", "high", "medium", "low"] as const;

const LEVEL_STYLE: Record<
  string,
  { text: string; bg: string; bar: string; icon: React.ComponentType<{ className?: string }> }
> = {
  critical: {
    text: "text-destructive",
    bg: "bg-destructive/10 border-destructive/25",
    bar: "bg-destructive",
    icon: AlertOctagon,
  },
  high: {
    text: "text-destructive/80",
    bg: "bg-destructive/5 border-destructive/15",
    bar: "bg-destructive/70",
    icon: AlertTriangle,
  },
  medium: {
    text: "text-warning",
    bg: "bg-warning/10 border-warning/20",
    bar: "bg-warning",
    icon: AlertTriangle,
  },
  low: {
    text: "text-success/70",
    bg: "bg-success/5 border-success/15",
    bar: "bg-success/60",
    icon: Info,
  },
};

export default function RisksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Loading...
        </div>
      }
    >
      <RisksContent />
    </Suspense>
  );
}

function RisksContent() {
  const searchParams = useSearchParams();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const urlId = searchParams.get("id");
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!urlId);
  const objectiveId = urlId ?? latestObjectiveId;
  const { data: dashboard, isLoading } = useDashboardQuery(objectiveId);
  const { data: objective } = useObjectiveQuery(objectiveId);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (urlId) {
      setActiveObjectiveId(urlId);
    }
  }, [urlId, setActiveObjectiveId]);

  const risks = dashboard?.risks;
  const topRisks = risks?.top_risks ?? [];
  const riskIndex = dashboard?.system_health?.risk_index ?? null;

  const filtered = useMemo(() => {
    const topRisks = dashboard?.risks?.top_risks ?? [];
    if (!severityFilter) return topRisks;
    return topRisks.filter((r) => r.risk_level === severityFilter);
  }, [dashboard?.risks?.top_risks, severityFilter]);

  const severityCounts = [
    { key: "critical", label: "Critical", value: risks?.critical ?? 0 },
    { key: "high", label: "High", value: risks?.high ?? 0 },
    { key: "medium", label: "Medium", value: risks?.medium ?? 0 },
    { key: "low", label: "Low", value: risks?.low ?? 0 },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <PageHeader
          kicker="Analyze"
          title="Risk Register"
          description={objective?.raw_input ?? "Risk assessment for active objective"}
          meta={
            (risks?.total ?? 0) > 0 ? (
              <span className="chip border-red-500/20 bg-red-500/10 text-red-400">
                {risks!.total} identified
              </span>
            ) : undefined
          }
          actions={
            objective ? <StatusBadge status={objective.status} size="sm" /> : undefined
          }
        />
      </motion.div>

      {isLoading ? (
        <PageSkeleton />
      ) : (risks?.total ?? 0) === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EmptyState
            icon={<ShieldAlert className="h-5 w-5" />}
            title="No risks identified yet"
            description="The Risk Agent flags high-probability threats once the pipeline runs on an objective."
          />
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Summary cards */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            <div className="rounded-xl border border-border/40 bg-card/30 p-4">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" />
                Total Risks
              </div>
              <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-foreground/80">
                {risks!.total}
              </div>
            </div>
            {severityCounts.map((s) => {
              const style = LEVEL_STYLE[s.key];
              const Icon = style.icon;
              return (
                <div key={s.key} className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <div
                    className={cn(
                      "flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.06em]",
                      style.text,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </div>
                  <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-foreground/80">
                    {s.value}
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-border/40 bg-card/30 p-4">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" />
                Risk Index
              </div>
              <div
                className={cn(
                  "mt-1.5 font-mono text-2xl font-bold tabular-nums",
                  riskIndex == null
                    ? "text-foreground/30"
                    : riskIndex >= 0.5
                      ? "text-red-400"
                      : riskIndex >= 0.3
                        ? "text-amber-400"
                        : "text-emerald-400",
                )}
              >
                {riskIndex != null ? `${Math.round(riskIndex * 100)}%` : "\u2014"}
              </div>
            </div>
          </motion.div>

          {/* Severity filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSeverityFilter(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                severityFilter === null
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/40 text-muted-foreground/60 hover:text-foreground/80",
              )}
            >
              All ({risks!.total})
            </button>
            {severityCounts.map((s) => {
              const style = LEVEL_STYLE[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() =>
                    setSeverityFilter((prev) =>
                      prev === s.key ? null : s.key,
                    )
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    severityFilter === s.key
                      ? cn(style.bg, style.text)
                      : "border-border/40 text-muted-foreground/60 hover:text-foreground/80",
                  )}
                >
                  {s.label} ({s.value})
                </button>
              );
            })}
          </div>

          {/* Risk cards */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((risk, i) => {
                const style =
                  LEVEL_STYLE[risk.risk_level] ?? LEVEL_STYLE.medium;
                const Icon = style.icon;
                const isExpanded = expandedId === risk.id;
                const pct = Math.round((risk.probability ?? 0) * 100);
                const impPct = Math.round((risk.impact ?? 0) * 100);
                const derivedScore = (risk.probability ?? 0) * (risk.impact ?? 0);
                const score = risk.risk_score ?? derivedScore;
                return (
                  <motion.div
                    key={risk.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden rounded-xl border border-border/40 bg-card"
                  >
                    <button
                      onClick={() => toggleExpand(risk.id)}
                      className="flex w-full items-start gap-3 p-4 text-left"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          style.bg,
                          style.text,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium text-foreground/90">
                            {risk.title}
                          </h3>
                          <HealthBadge
                            status={risk.risk_level as "low" | "medium" | "high" | "critical"}
                            type="risk"
                            size="sm"
                          />
                          {risk.status && (
                            <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                              {risk.status}
                            </span>
                          )}
                        </div>
                        {risk.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {risk.description}
                          </p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/50">
                              Probability
                            </span>
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-muted/30">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, delay: 0.15 + i * 0.03 }}
                                className={cn("h-full rounded-full", style.bar)}
                              />
                            </div>
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                              {pct}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/50">
                              Impact
                            </span>
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-muted/30">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${impPct}%` }}
                                transition={{ duration: 0.7, delay: 0.25 + i * 0.03 }}
                                className={cn("h-full rounded-full", style.bar)}
                              />
                            </div>
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                              {impPct}%
                            </span>
                          </div>
                          <div
                            className={cn(
                              "rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
                              style.bg,
                              style.text,
                            )}
                          >
                            score {score.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
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
                          <div className="space-y-3 border-t border-border/30 px-4 py-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                              {risk.category && (
                                <div className="flex items-start gap-2">
                                  <Boxes className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                                      Category
                                    </div>
                                    <div className="mt-0.5 text-xs text-foreground/80">
                                      {risk.category}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {risk.owner && (
                                <div className="flex items-start gap-2">
                                  <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                                      Owner
                                    </div>
                                    <div className="mt-0.5 text-xs text-foreground/80">
                                      {risk.owner}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {risk.risk_level && (
                                <div className="flex items-start gap-2">
                                  <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                                      Assessed Level
                                    </div>
                                    <div className="mt-0.5 text-xs text-foreground/80">
                                      {risk.risk_level} · p={pct}% × i={impPct}%
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {risk.mitigation && (
                              <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-success/5 p-3">
                                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success/70" />
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-success/70">
                                    Mitigation
                                  </div>
                                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                    {risk.mitigation}
                                  </p>
                                </div>
                              </div>
                            )}
                            {risk.contingency && (
                              <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/20 p-3">
                                <LifeBuoy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                                    Contingency Plan
                                  </div>
                                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                    {risk.contingency}
                                  </p>
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
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="rounded-xl border border-border/40 bg-card p-10 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No {severityFilter} risks for this objective.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
