"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { type Memory } from "@/types";
import {
  Brain,
  X,
  Target,
  Lightbulb,
  Zap,
  Scale,
  Sparkles,
  History,
  Tag,
  Calendar,
  Fingerprint,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ConfidencePill({ value }: { value: number | null }) {
  const confidence = value ?? 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        confidence >= 0.8
          ? "bg-success/10 text-success ring-success/20"
          : confidence >= 0.6
            ? "bg-amber-500/10 text-amber-500 ring-amber-500/20"
            : "bg-destructive/10 text-destructive ring-destructive/20"
      )}
    >
      <Target className="h-3 w-3" />
      {Math.round(confidence * 100)}% confidence
    </span>
  );
}

const HISTORY_LABELS: Record<string, string> = {
  created: "Created",
  retrieved: "Retrieved by planner",
  reused: "Reused by a plan",
  updated: "Updated",
};

function HistoryTimeline({ history }: { history: Memory["history"] }) {
  if (!history || history.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground/40">
        No lifecycle events recorded yet.
      </p>
    );
  }
  const entries = [...history].reverse();
  return (
    <div className="space-y-0">
      {entries.map((entry, i) => {
        const Icon =
          entry.action === "reused" ? Repeat : entry.action === "retrieved" ? TrendingUp : History;
        return (
          <div key={`${entry.timestamp}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
            {i < entries.length - 1 && (
              <span className="absolute left-[11px] top-6 h-full w-px bg-border/30" />
            )}
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/30 bg-card">
              <Icon className="h-3 w-3 text-muted-foreground/50" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-foreground/80">
                {HISTORY_LABELS[entry.action] ?? entry.action}
              </p>
              <p className="text-[10px] text-muted-foreground/40">
                {formatDate(entry.timestamp)}
                {entry.actor && entry.actor !== "system" ? ` · by ${entry.actor}` : ""}
              </p>
              {entry.changes && Object.keys(entry.changes).length > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground/50">
                  {Object.keys(entry.changes).join(", ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
  similarityScore?: number;
}

interface MemoryDetailPanelProps {
  memory: Memory;
  onClose: () => void;
  similarityScore?: number;
}

export function MemoryDetailModal({ memory, onClose, similarityScore }: MemoryDetailModalProps) {
  return (
    <AnimatePresence>
      {memory && (
        <MemoryDetailPanel
          memory={memory}
          onClose={onClose}
          similarityScore={similarityScore}
        />
      )}
    </AnimatePresence>
  );
}

function MemoryDetailPanel({ memory, onClose, similarityScore }: MemoryDetailPanelProps) {
  const content = memory.content;
  const tags = memory.tags || [];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Memory details"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/20 p-5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Brain className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground/90">
                    {content?.summary || "Untitled Memory"}
                  </h3>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/40">
                    {memory.id}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              <div className="flex flex-wrap items-center gap-2">
                <ConfidencePill value={memory.confidence} />
                {similarityScore !== undefined && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/20">
                    <Sparkles className="h-3 w-3" />
                    {(similarityScore * 100).toFixed(0)}% similar
                  </span>
                )}
                <Badge variant="outline" className="text-[10px]">
                  <Fingerprint className="h-2.5 w-2.5 mr-1" />v{memory.version}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/20 bg-muted/20 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                    <Calendar className="h-3 w-3" /> Created
                  </div>
                  <p className="mt-1 text-[11px] text-foreground/70">{formatDate(memory.created_at)}</p>
                </div>
                <div className="rounded-lg border border-border/20 bg-muted/20 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                    <TrendingUp className="h-3 w-3" /> Last retrieved
                  </div>
                  <p className="mt-1 text-[11px] text-foreground/70">
                    {formatDate(String(memory.metadata?.last_retrieved_at ?? ""))}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-lg border border-border/20 bg-muted/20 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                    <Repeat className="h-3 w-3" /> Usage
                  </div>
                  <p className="mt-1 text-[11px] text-foreground/70">
                    {Number(memory.metadata?.usage_count ?? 0)} reference
                    {Number(memory.metadata?.usage_count ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {/* Strategy */}
              {content?.strategy && (
                <div className="mt-5">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                    <Target className="h-3 w-3" /> Strategy
                  </h4>
                  <p className="text-[13px] leading-relaxed text-foreground/80">{content.strategy}</p>
                </div>
              )}

              {/* Lessons */}
              {(content?.lessons_learned?.length || 0) > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                    <Lightbulb className="h-3 w-3" /> Lessons learned
                  </h4>
                  <div className="space-y-2">
                    {content!.lessons_learned.map((lesson, i) => (
                      <div key={i} className="rounded-lg border border-border/20 bg-muted/20 p-3">
                        <p className="text-[12px] font-medium text-foreground/80">{lesson.lesson}</p>
                        {lesson.context && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground/50">{lesson.context}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks */}
              {(content?.risks?.length || 0) > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                    <Zap className="h-3 w-3" /> Risks
                  </h4>
                  <div className="space-y-2">
                    {content!.risks.map((risk, i) => (
                      <div key={i} className="rounded-lg border border-border/20 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] font-medium text-foreground/80">{risk.title}</p>
                          {risk.materialized && (
                            <Badge variant="destructive" className="text-[9px] h-4">materialized</Badge>
                          )}
                        </div>
                        {risk.description && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground/50">{risk.description}</p>
                        )}
                        {risk.mitigation && (
                          <p className="mt-1 text-[11px] text-foreground/60">
                            <span className="text-muted-foreground/40">Mitigation: </span>
                            {risk.mitigation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decisions */}
              {(content?.decisions?.length || 0) > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                    <Scale className="h-3 w-3" /> Decisions
                  </h4>
                  <div className="space-y-2">
                    {content!.decisions.map((decision, i) => (
                      <div key={i} className="rounded-lg border border-border/20 bg-muted/20 p-3">
                        <p className="text-[12px] font-medium text-foreground/80">{decision.title}</p>
                        {decision.description && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground/50">{decision.description}</p>
                        )}
                        {decision.impact && (
                          <p className="mt-1 text-[10px] text-muted-foreground/40">
                            Impact: {decision.impact}
                            {decision.outcome ? ` · ${decision.outcome}` : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success factors */}
              {(content?.success_factors?.length || 0) > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                    <Sparkles className="h-3 w-3" /> Success factors
                  </h4>
                  <div className="space-y-2">
                    {content!.success_factors.map((factor, i) => (
                      <div key={i} className="rounded-lg border border-border/20 bg-muted/20 p-3">
                        <p className="text-[12px] font-medium text-foreground/80">{factor.factor}</p>
                        {factor.evidence && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground/50">{factor.evidence}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                    <Tag className="h-3 w-3" /> Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] h-5 px-2">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              <div className="mt-6">
                <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                  <History className="h-3 w-3" /> Lifecycle
                </h4>
                <HistoryTimeline history={memory.history} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/20 px-5 py-3">
              <span className="text-[10px] text-muted-foreground/40">
                Objective {memory.objective_id.slice(0, 8)}
              </span>
              <span className="text-[10px] text-muted-foreground/40">
                Updated {formatDate(memory.updated_at)}
              </span>
            </div>
        </motion.div>
      </motion.div>
  );
}
