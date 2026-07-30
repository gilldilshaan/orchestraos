"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { HealthBadge } from "@/components/health-badge";
import { ArrowRight, Lightbulb } from "lucide-react";
import { useDecisions } from "@/hooks/use-dashboard";
import { PremiumCard } from "@/components/premium/premium-card";

export function DecisionPreview() {
  const { decisions } = useDecisions();
  const latest = decisions[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="enterprise-panel p-5"
    >
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <motion.div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/8 border border-violet-400/10"
              whileHover={{ scale: 1.05 }}
            >
              <Lightbulb className="h-4 w-4 text-violet-400/70" />
            </motion.div>
            <div>
              <h2 className="text-sm font-semibold text-foreground/80">Latest Decision</h2>
              {latest ? (
                <>
                  <h3 className="mt-1.5 text-sm font-medium text-foreground/80">{latest.title}</h3>
                  <p className="mt-0.5 max-w-md text-xs text-muted-foreground/50 line-clamp-2">
                    {latest.executive_summary}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <HealthBadge status={latest.risk_level} type="risk" size="sm" />
                    <span className="text-xs text-muted-foreground/40">
                      {Math.round(latest.confidence * 100)}% confidence
                    </span>
                    <span className="text-xs text-muted-foreground/40">
                      {latest.tradeoffs.length} options
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground/50">
                  No data available for this execution.
                </p>
              )}
            </div>
          </div>
          <Link
            href="/decisions"
            className="inline-flex items-center gap-1 rounded-lg border border-border/20 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-secondary-foreground/70 transition-all hover:bg-muted/20 hover:text-foreground/60 active:scale-[0.98]"
          >
            Open Center
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
