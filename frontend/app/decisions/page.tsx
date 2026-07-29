"use client";

import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";

const decisions = [
  {
    title: "Technology Stack Selection",
    summary: "Select between React Native, Flutter, or native development for the mobile platform initiative.",
    confidence: 0.88,
    risk: "low" as const,
    options: 3,
    status: "completed" as const,
  },
  {
    title: "Cloud Infrastructure Provider",
    summary: "Evaluate AWS, GCP, and Azure for the AI compute workloads.",
    confidence: 0.82,
    risk: "medium" as const,
    options: 3,
    status: "idle" as const,
  },
  {
    title: "Team Structure Model",
    summary: "Determine between functional, matrix, or tribal team organization.",
    confidence: 0.91,
    risk: "low" as const,
    options: 3,
    status: "completed" as const,
  },
  {
    title: "Budget Allocation Strategy",
    summary: "Allocate capital across R&D, marketing, operations, and contingency.",
    confidence: 0.75,
    risk: "high" as const,
    options: 4,
    status: "idle" as const,
  },
  {
    title: "Go-to-Market Approach",
    summary: "Choose between phased rollout, big bang, or beta-first strategy.",
    confidence: 0.86,
    risk: "medium" as const,
    options: 3,
    status: "idle" as const,
  },
];

export default function DecisionsPage() {
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
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {decisions.filter((d) => d.status === "idle").length} Pending
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        {decisions.map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="group cursor-pointer rounded-lg border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:bg-card/80"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{d.title}</h3>
                  <HealthBadge status={d.risk} type="risk" size="sm" />
                  <HealthBadge status={d.status} size="sm" />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                  {d.summary}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {d.options} options considered
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
    </div>
  );
}
