"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { useDecisionsQuery, useLatestObjectiveIdQuery } from "@/hooks/use-api";
import type { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";
import {
  Lightbulb,
  ChevronDown,
  Target,
  BrainCircuit,
  AlertTriangle,
  ListChecks,
} from "lucide-react";

export default function DecisionsPage() {
  const { data: objectiveId } = useLatestObjectiveIdQuery();
  const { data: decisions } = useDecisionsQuery(objectiveId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Decision Center
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              AI-generated strategic decisions with explainability metadata
            </p>
          </div>
          {decisions && decisions.length > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {decisions.length} Total
            </span>
          )}
        </div>
      </motion.div>

      {!decisions || decisions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No decisions yet. Run a pipeline to generate strategic decisions.
          </p>
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
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="rounded-lg border border-border/50 bg-card transition-all duration-200 hover:border-border"
              >
                <button
                  onClick={() => toggleExpand(d.id)}
                  className="flex w-full items-start justify-between gap-4 p-5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{d.title}</h3>
                      <HealthBadge status={riskLevel} type="risk" size="sm" />
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                      {d.reasoning}
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {optionsCount} option(s) considered
                      </span>
                      <ConfidenceBar
                        value={d.confidence}
                        size="sm"
                        className="w-20"
                        showValue
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground/60">
                      Explainability
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
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
                      <div className="border-t border-border/30 px-5 py-4 space-y-5">
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
                                  className="rounded-lg border border-border/30 bg-muted/20 p-3"
                                >
                                  <h4 className="text-xs font-medium text-foreground/80 mb-2">
                                    {opt.name}
                                  </h4>
                                  {opt.pros.length > 0 && (
                                    <div className="mb-2">
                                      <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80">
                                        Pros
                                      </span>
                                      <ul className="mt-1 space-y-0.5">
                                        {opt.pros.map((p, k) => (
                                          <li
                                            key={k}
                                            className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                          >
                                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400/50" />
                                            {p}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {opt.cons.length > 0 && (
                                    <div>
                                      <span className="text-[10px] font-medium uppercase tracking-wider text-red-400/80">
                                        Cons
                                      </span>
                                      <ul className="mt-1 space-y-0.5">
                                        {opt.cons.map((c, k) => (
                                          <li
                                            key={k}
                                            className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                          >
                                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400/50" />
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
                          <div className="flex items-center gap-2">
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
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", color)} />
        <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground/60">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}
