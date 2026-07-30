"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { ArrowRight, Lightbulb, TrendingUp, Building2, ChevronRight, Scale, Circle } from "lucide-react";
import { useDecisions } from "@/hooks/use-dashboard";

export function DecisionPreview() {
  const { decisions } = useDecisions();
  const latest = decisions[0];

  return (
    <div className="bento-tile-accent p-6">
      <div className="relative z-[1]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <motion.div
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400/15 to-violet-400/5 border border-violet-400/15"
              whileHover={{ scale: 1.05 }}
            >
              <Lightbulb className="h-5 w-5 text-violet-400" />
              <motion.div
                className="pointer-events-none absolute -inset-1 rounded-xl border border-violet-400/20"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xs font-semibold text-foreground/80">Latest Decision</h2>
                {latest && (
                  <HealthBadge status={latest.risk_level} type="risk" size="sm" />
                )}
              </div>
              {latest ? (
                <>
                  <h3 className="text-sm font-semibold text-foreground/90 leading-snug">{latest.title}</h3>
                  <p className="mt-1.5 max-w-lg text-xs text-muted-foreground/60 leading-relaxed line-clamp-2">
                    {latest.executive_summary}
                  </p>
                  <div className="mt-4 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <motion.div
                        className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-400/10 border border-violet-400/15"
                        animate={{ rotate: [0, 5, 0, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <TrendingUp className="h-3 w-3 text-violet-400" />
                      </motion.div>
                      <span className="text-xs font-medium text-foreground/70">{Math.round(latest.confidence * 100)}% confidence</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5">
                        {(latest.tradeoffs ?? []).slice(0, 3).map((_, j) => (
                          <div key={j} className="h-5 w-5 rounded-full border-2 border-background bg-violet-400/20 flex items-center justify-center">
                            <Building2 className="h-2.5 w-2.5 text-violet-400/60" />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground/50">
                        {latest.tradeoffs.length} option{latest.tradeoffs.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="w-24">
                      <ConfidenceBar value={latest.confidence} size="sm" showValue={false} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-1">
                  <p className="text-sm text-foreground/60">No decisions recorded for this objective yet.</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/40">
                    Run a full pipeline to generate AI-powered strategy decisions.
                  </p>
                </div>
              )}
            </div>
          </div>
          <Link
            href="/decisions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/20 bg-gradient-to-br from-secondary/60 to-secondary/30 px-3.5 py-2 text-[11px] font-medium text-secondary-foreground/70 transition-all hover:bg-muted/20 hover:text-foreground/60 hover:border-border/40 active:scale-[0.98] group"
          >
            Open Center
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
