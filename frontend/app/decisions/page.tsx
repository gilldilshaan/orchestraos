"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import {
  useApproveDecision,
  useDecisionsQuery,
  useLatestObjectiveIdQuery,
  useRejectDecision,
} from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import type { ExecutionStatus, RiskLevel } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Lightbulb,
  ChevronDown,
  Target,
  BrainCircuit,
  AlertTriangle,
  ListChecks,
  Check,
  X,
  Loader2,
  Scale,
  Orbit,
  ExternalLink,
} from "lucide-react";

const STATUS_STYLES: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  PENDING: { label: "Pending", dot: "bg-amber-400", bg: "bg-amber-400/8", border: "border-amber-400/20" },
  APPROVED: { label: "Approved", dot: "bg-emerald-400", bg: "bg-emerald-400/8", border: "border-emerald-400/20" },
  REJECTED: { label: "Rejected", dot: "bg-red-400", bg: "bg-red-400/8", border: "border-red-400/20" },
  UNDER_REVIEW: { label: "Under Review", dot: "bg-violet-400", bg: "bg-violet-400/8", border: "border-violet-400/20" },
};

function mapDecisionStatus(status: string): ExecutionStatus {
  if (status === "APPROVED") return "completed";
  if (status === "REJECTED") return "failed";
  if (status === "UNDER_REVIEW") return "running";
  return "idle";
}

export default function DecisionsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <DecisionsContent />
    </Suspense>
  );
}

function DecisionsContent() {
  const searchParams = useSearchParams();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const urlId = searchParams.get("id");
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!urlId);
  const objectiveId = urlId ?? latestObjectiveId;
  const { data: decisions } = useDecisionsQuery(objectiveId);
  const approveMutation = useApproveDecision();
  const rejectMutation = useRejectDecision();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync URL param to global execution context
  useEffect(() => {
    if (urlId) {
      setActiveObjectiveId(urlId);
    }
  }, [urlId, setActiveObjectiveId]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const runAction = (
    id: string,
    action: "approve" | "reject",
  ) => {
    setActionError(null);
    setPendingId(id);
    const payload = { decisionId: id, notes: notes[id] || undefined };
    const mutation = action === "approve" ? approveMutation : rejectMutation;
    mutation.mutate(payload, {
      onSuccess: () => setPendingId(null),
      onError: (err) => {
        setPendingId(null);
        setActionError(err instanceof Error ? err.message : "Action failed");
      },
    });
  };

  const isActionPending = (id: string) => pendingId === id;
  const canAct = (status: string) =>
    status === "PENDING" || status === "UNDER_REVIEW";

  const pendingCount = decisions?.filter((d) => d.status === "PENDING").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15">
                <Scale className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Decision Center</h1>
                <p className="text-sm text-muted-foreground/60">Review, approve, or reject AI-generated strategic decisions</p>
              </div>
            </div>
          </div>
          {decisions && decisions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
                {decisions.length} Total
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-400">
                  {pendingCount} Pending
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Empty State */}
      {!decisions || decisions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-violet-950/10 via-background to-background"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />
          </div>
          <div className="relative flex flex-col items-center px-12 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 mb-5">
              <Scale className="h-7 w-7 text-violet-400/60" />
            </div>
            <h2 className="text-base font-semibold text-foreground/80">No decisions yet</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground/50 leading-relaxed">
              AI-generated strategic decisions will appear here once an objective reaches the decision stage.
              Approve or reject each decision to guide the organization forward.
            </p>
            <Link
              href="/objective"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border/40 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 px-5 py-2.5 text-xs font-medium text-foreground/70 transition-all duration-200 hover:border-violet-400/30 hover:text-foreground hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.1)]"
            >
              <Orbit className="h-3.5 w-3.5 text-violet-400" />
              Start a new objective
              <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-3"
        >
          {decisions.map((d, i) => {
            const isExpanded = expandedId === d.id;
            const optionsCount = d.options?.length ?? 0;
            const riskLevel = d.risk_level as RiskLevel;
            const st = STATUS_STYLES[d.status] ?? STATUS_STYLES.PENDING;

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={cn(
                  "rounded-xl border transition-all duration-300 overflow-hidden",
                  d.status === "APPROVED" ? "border-emerald-500/20 bg-emerald-500/[0.02]" :
                  d.status === "REJECTED" ? "border-red-500/20 bg-red-500/[0.02]" :
                  "border-border/50 bg-card hover:border-border"
                )}
              >
                <div className="flex w-full items-start justify-between gap-4 p-5">
                  <button
                    onClick={() => toggleExpand(d.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{d.title}</h3>
                      <HealthBadge status={riskLevel} type="risk" size="sm" />
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium", st.bg, st.border, `text-${st.dot.replace("bg-", "")}`)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground/70 leading-relaxed line-clamp-2">
                      {d.reasoning}
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <span className="text-xs text-muted-foreground/50">
                        {optionsCount} option{optionsCount !== 1 ? "s" : ""} considered
                      </span>
                      <ConfidenceBar
                        value={d.confidence}
                        size="sm"
                        className="w-24"
                        showValue
                      />
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <HealthBadge
                      status={mapDecisionStatus(d.status)}
                      type="status"
                      size="sm"
                    />
                    {canAct(d.status) && (
                      <>
                        <button
                          onClick={() => runAction(d.id, "approve")}
                          disabled={isActionPending(d.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
                        >
                          {isActionPending(d.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => runAction(d.id, "reject")}
                          disabled={isActionPending(d.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleExpand(d.id)}
                      className="flex items-center gap-2"
                      aria-label="Toggle details"
                    >
                      <span className="text-[10px] text-muted-foreground/60">
                        Explainability
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/30 px-5 py-5 space-y-5">
                        <Section
                          icon={Lightbulb}
                          title="Recommendation"
                          color="text-amber-400"
                        >
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {d.recommendation}
                          </p>
                        </Section>

                        <Section
                          icon={BrainCircuit}
                          title="Reasoning"
                          color="text-violet-400"
                        >
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {d.reasoning}
                          </p>
                        </Section>

                        {d.evidence && d.evidence.length > 0 && (
                          <Section
                            icon={ListChecks}
                            title="Supporting Evidence"
                            color="text-emerald-400"
                          >
                            <ul className="space-y-1.5">
                              {d.evidence.map((ev, j) => (
                                <li
                                  key={j}
                                  className="flex items-start gap-2 text-sm text-muted-foreground"
                                >
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/60" />
                                  {ev}
                                </li>
                              ))}
                            </ul>
                          </Section>
                        )}

                        {d.options && d.options.length > 0 && (
                          <Section
                            icon={Target}
                            title="Options Considered"
                            color="text-blue-400"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              {d.options.map((opt, j) => (
                                <div
                                  key={opt.id ?? j}
                                  className={cn(
                                    "rounded-xl border p-4 transition-all duration-200",
                                    opt.is_recommended
                                      ? "border-emerald-500/20 bg-emerald-500/5"
                                      : "border-border/30 bg-muted/20"
                                  )}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-xs font-semibold text-foreground/80">{opt.name}</h4>
                                    {opt.is_recommended && (
                                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-400">Recommended</span>
                                    )}
                                  </div>
                                  {opt.pros.length > 0 && (
                                    <div className="mb-3">
                                      <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80">Pros</span>
                                      <ul className="mt-1.5 space-y-1">
                                        {opt.pros.map((p, k) => (
                                          <li key={k} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/50" />
                                            {p}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {opt.cons.length > 0 && (
                                    <div>
                                      <span className="text-[10px] font-medium uppercase tracking-wider text-red-400/80">Cons</span>
                                      <ul className="mt-1.5 space-y-1">
                                        {opt.cons.map((c, k) => (
                                          <li key={k} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/50" />
                                            {c}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </Section>
                        )}

                        <Section
                          icon={AlertTriangle}
                          title="Risk Assessment"
                          color="text-red-400"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              Overall Risk Level:
                            </span>
                            <HealthBadge
                              status={riskLevel}
                              type="risk"
                              size="sm"
                            />
                          </div>
                        </Section>

                        {canAct(d.status) && (
                          <div className="border-t border-border/30 pt-4">
                            <input
                              value={notes[d.id] ?? ""}
                              onChange={(e) =>
                                setNotes((prev) => ({
                                  ...prev,
                                  [d.id]: e.target.value,
                                }))
                              }
                              placeholder="Optional review notes..."
                              className="w-full rounded-lg border border-border/30 bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
                            />
                          </div>
                        )}
                        {actionError && (
                          <p className="text-xs text-red-400">{actionError}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
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
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className={cn("h-4 w-4", color)} />
        <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground/60">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}
