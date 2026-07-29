"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useSSEStore } from "@/store/sse-store";
import { Orbit, UserCheck, FileText, Scale, Activity, Zap } from "lucide-react";

const stageIcons: Record<string, { icon: typeof Orbit; color: string; bg: string }> = {
  compiler: { icon: Orbit, color: "text-primary", bg: "bg-primary/10" },
  planner: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  organization: { icon: Orbit, color: "text-success", bg: "bg-success/10" },
  risk: { icon: Scale, color: "text-violet-400", bg: "bg-violet-400/10" },
  decision: { icon: Scale, color: "text-violet-400", bg: "bg-violet-400/10" },
  devils_advocate: { icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  dashboard: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
};

const defaultIcon = { icon: Zap, color: "text-warning", bg: "bg-warning/10" };

function stageLabel(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LiveActivity() {
  const sseEvents = useSSEStore((s) => s.events);
  const connected = useSSEStore((s) => s.connected);

  const events = useMemo(() => {
    return sseEvents.slice(-20).map((e) => {
      const cfg = stageIcons[e.stage] ?? defaultIcon;
      return {
        Icon: cfg.icon,
        label: stageLabel(e.stage) + (e.status ? `: ${e.status}` : ""),
        detail: e.message,
        time: e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : "—",
        color: cfg.color,
        bg: cfg.bg,
      };
    });
  }, [sseEvents]);

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
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary" : "bg-muted-foreground/30"}`}
              animate={connected ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] text-muted-foreground">{connected ? "Live" : "Disconnected"}</span>
          </div>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet. Start a pipeline run to see live events.</p>
        ) : (
          <div className="space-y-0.5">
            {events.slice(0, 20).map((event, i) => {
              const Icon = event.Icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.02, ease: [0.32, 0.72, 0, 1] }}
                  className="group/event flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-muted/30"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${event.bg} transition-transform duration-200 group-hover/event:scale-105`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${event.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{event.label}</span>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {event.time}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{event.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.section>
  );
}
