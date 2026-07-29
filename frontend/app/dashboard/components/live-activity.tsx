"use client";

import { motion } from "motion/react";
import {
  Orbit,
  UserCheck,
  FileText,
  Scale,
  Activity,
  Zap,
} from "lucide-react";

const events = [
  {
    icon: Orbit,
    label: "Organization Created",
    detail: "E-commerce Platform Expansion",
    time: "12:00:01",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: UserCheck,
    label: "Executive: CTO Finished",
    detail: "Confidence: 0.92",
    time: "12:00:04",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    icon: FileText,
    label: "Report Generated",
    detail: "Executive Summary — CTO",
    time: "12:00:04",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Scale,
    label: "Decision Generated",
    detail: "Technology Stack Selection",
    time: "12:00:05",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Activity,
    label: "Supervisor Analysis",
    detail: "Cross-dept coordination review",
    time: "12:00:06",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: Zap,
    label: "Specialist: ML Engineer Done",
    detail: "Assigned to CTO, confidence: 0.91",
    time: "12:00:07",
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

export function LiveActivity() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border/80"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Live Activity</h2>
          <div className="flex items-center gap-1.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] text-muted-foreground">Live</span>
          </div>
        </div>
        <div className="space-y-0.5">
          {events.map((event, i) => {
            const Icon = event.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05, ease: [0.32, 0.72, 0, 1] }}
                className="group/event flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-muted/30"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${event.bg} transition-transform duration-200 group-hover/event:scale-105`}
                >
                  <Icon className={`h-3.5 w-3.5 ${event.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{event.label}</span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {event.time}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {event.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
