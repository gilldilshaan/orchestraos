"use client";

import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { useDecisions } from "@/hooks/use-dashboard";

export default function DecisionsPage() {
  const { decisions } = useDecisions();

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
              AI-generated strategic decisions with supporting evidence
            </p>
          </div>
          {decisions.length > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {decisions.length} Total
            </span>
          )}
        </div>
      </motion.div>

      {decisions.length === 0 ? (
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
          {decisions.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="group cursor-pointer rounded-lg border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:bg-card/80"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{d.title}</h3>
                    <HealthBadge status={d.risk_level} type="risk" size="sm" />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                    {d.executive_summary}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {d.tradeoffs.length} option(s) considered
                    </span>
                    <ConfidenceBar value={d.confidence} size="sm" className="w-20" showValue />
                  </div>
                </div>
                <div className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
