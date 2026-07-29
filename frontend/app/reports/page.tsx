"use client";

import { motion } from "motion/react";
import { HealthBadge } from "@/components/health-badge";

const reports = [
  {
    type: "Executive Report",
    title: "Strategic Market Expansion Analysis",
    date: "2026-07-28",
    confidence: 0.92,
    risk: "low" as const,
  },
  {
    type: "Organization Report",
    title: "Company Structure & Role Allocation",
    date: "2026-07-28",
    confidence: 0.88,
    risk: "low" as const,
  },
  {
    type: "Supervisor Analysis",
    title: "Cross-Department Coordination Review",
    date: "2026-07-27",
    confidence: 0.85,
    risk: "medium" as const,
  },
  {
    type: "Decision Report",
    title: "Technology Stack Selection Tradeoffs",
    date: "2026-07-27",
    confidence: 0.79,
    risk: "medium" as const,
  },
  {
    type: "Risk Assessment",
    title: "Comprehensive Risk Matrix & Mitigation",
    date: "2026-07-26",
    confidence: 0.91,
    risk: "high" as const,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated strategic reports and analyses
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        {reports.map((report, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="group cursor-pointer rounded-lg border border-border/50 bg-card p-5 transition-all duration-200 hover:border-border hover:bg-card/80"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {report.type}
                  </span>
                  <HealthBadge status={report.risk} type="risk" size="sm" />
                </div>
                <h3 className="mt-1.5 text-sm font-medium">
                  {report.title}
                </h3>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{report.date}</span>
                  <span>
                    Confidence: {(report.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="ml-4 flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
