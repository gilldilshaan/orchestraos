"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { HealthBadge } from "@/components/health-badge";
import { ArrowRight, Lightbulb } from "lucide-react";
import { useDecisions } from "@/hooks/use-dashboard";

export function DecisionPreview() {
  const { decisions } = useDecisions();
  const latest = decisions[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border/80"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "radial-gradient(400px circle at 30% 50%, hsl(var(--glow-purple) / 0.06), transparent 60%)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <motion.div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/10"
              whileHover={{ scale: 1.05 }}
            >
              <Lightbulb className="h-4 w-4 text-violet-400" />
            </motion.div>
            <div>
              <h2 className="text-sm font-semibold">Latest Decision</h2>
              {latest ? (
                <>
                  <h3 className="mt-1.5 text-sm font-medium">{latest.title}</h3>
                  <p className="mt-0.5 max-w-md text-xs text-muted-foreground line-clamp-2">
                    {latest.executive_summary}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <HealthBadge status={latest.risk_level} type="risk" size="sm" />
                    <span className="text-xs text-muted-foreground">
                      Confidence: {Math.round(latest.confidence * 100)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {latest.tradeoffs.length} option(s)
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  No decisions yet. Run a pipeline to generate strategic decisions.
                </p>
              )}
            </div>
          </div>
          <Link
            href="/decisions"
            className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-all hover:bg-muted/50 active:scale-[0.98]"
          >
            Open Center
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
