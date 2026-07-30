"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { useDecisionsQuery, useLatestObjectiveIdQuery } from "@/hooks/use-api";
import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Lightbulb,
  ChevronDown,
  Target,
  BrainCircuit,
  AlertTriangle,
  ListChecks,
  Scale,
  Orbit,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import type { RiskLevel } from "@/types";

const STATUS_STYLES: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  PENDING: { label: "Pending", dot: "bg-amber-400", bg: "bg-amber-400/8", border: "border-amber-400/20" },
  APPROVED: { label: "Approved", dot: "bg-emerald-400", bg: "bg-emerald-400/8", border: "border-emerald-400/20" },
  REJECTED: { label: "Rejected", dot: "bg-red-400", bg: "bg-red-400/8", border: "border-red-400/20" },
  UNDER_REVIEW: { label: "Under Review", dot: "bg-violet-400", bg: "bg-violet-400/8", border: "border-violet-400/20" },
};

export default function DecisionsPage() {
  const { data: objectiveId } = useLatestObjectiveIdQuery();
  const { data: decisions } = useDecisionsQuery(objectiveId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleAction = useCallback(async (decisionId: string, action: "approve" | "reject") => {
    setActionLoading(decisionId);
    try {
      await apiClient.post(`/decisions/${decisionId}/${action}`, {
        notes: notes || null,
        user_id: "admin",
      });
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
    } catch {
      // error handled silently
    } finally {
      setActionLoading(null);
    }
  }, [notes, queryClient]);

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
            const isLoading = actionLoading === d.id;

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className={cn(
                  "rounded-xl border transition-all duration-300 overflow-hidden",
                  d.status === "APPROVED" ? "border-emerald-500/20 bg-emerald-500/[0.02]" :
                  d.status === "REJECTED" ? "border-red-500/20 bg-red-500/[0.02]" :
                  "border-border/50 bg-card hover:border-border"
                )}
              >
                {/* Main Card */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                  className="flex w-full items-start justify-between gap-4 p-5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
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
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground/50">Details</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground/40 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </button>

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

                        {/* Approve / Reject Actions */}
                        {d.status === "PENDING" && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.03] to-indigo-500/[0.03] p-5"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <MessageSquare className="h-4 w-4 text-violet-400" />
                              <span className="text-xs font-semibold text-violet-300">Your Review</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                placeholder="Add review notes (optional)..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="min-w-0 flex-1 rounded-lg border border-border/30 bg-background/60 px-3.5 py-2.5 text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-400/30 focus:border-violet-400/30 transition-all"
                              />
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleAction(d.id, "approve")}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 px-4 py-2.5 text-xs font-semibold text-emerald-300 border border-emerald-500/20 hover:from-emerald-500/30 hover:to-emerald-600/20 hover:border-emerald-500/30 transition-all duration-200 disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <span className="h-3.5 w-3.5 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                Approve
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleAction(d.id, "reject")}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-red-500/15 to-red-600/10 px-4 py-2.5 text-xs font-semibold text-red-300 border border-red-500/15 hover:from-red-500/25 hover:to-red-600/15 hover:border-red-500/25 transition-all duration-200 disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </motion.button>
                            </div>
                          </motion.div>
                        )}

                        {d.status !== "PENDING" && d.review_notes && (
                          <div className="rounded-lg bg-muted/15 px-4 py-3 border border-border/20">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50" />
                              <span className="text-[10px] font-medium text-muted-foreground/60">Review Notes</span>
                            </div>
                            <p className="text-xs text-muted-foreground/70 italic">&ldquo;{d.review_notes}&rdquo;</p>
                          </div>
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
