"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const orgNodes = [
  { title: "CEO", level: 0, status: "completed" as const },
  { title: "CTO", level: 1, status: "completed" as const },
  { title: "CFO", level: 1, status: "completed" as const },
  { title: "COO", level: 1, status: "running" as const },
  { title: "CMO", level: 1, status: "completed" as const },
  { title: "CPO", level: 1, status: "pending" as const },
  { title: "ML Engineer", level: 2, status: "completed" as const },
  { title: "Data Analyst", level: 2, status: "running" as const },
  { title: "UX Researcher", level: 2, status: "completed" as const },
  { title: "Infra Engineer", level: 2, status: "pending" as const },
  { title: "Security Analyst", level: 2, status: "pending" as const },
  { title: "QA Lead", level: 2, status: "running" as const },
];

const levelColors = [
  "border-primary/30 bg-primary/5 text-primary",
  "border-blue-400/20 bg-blue-400/5 text-blue-400",
  "border-emerald-400/20 bg-emerald-400/5 text-emerald-400",
];

const levelLabels = ["CEO", "Executives", "Specialists"];

export function OrganizationPreview() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border/80"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Organization</h2>
          <Link
            href="/organization"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Open Explorer →
          </Link>
        </div>

        <div className="space-y-4">
          {[0, 1, 2].map((level) => (
            <div key={level}>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {levelLabels[level]}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {orgNodes
                  .filter((n) => n.level === level)
                  .map((node) => (
                    <motion.div
                      key={node.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ scale: 1.05 }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                        levelColors[level]
                      )}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          node.status === "running"
                            ? "bg-primary"
                            : node.status === "completed"
                              ? "bg-success"
                              : "bg-muted-foreground/30"
                        } ${node.status === "running" ? "animate-pulse" : ""}`}
                      />
                      {node.title}
                    </motion.div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
