"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useSSEStore } from "@/store/sse-store";
import { Orbit, UserCheck, FileText, Scale, Activity, Zap } from "lucide-react";
import { PulseRing } from "@/components/premium/page-transition";

const stageIcons: Record<string, { icon: typeof Orbit; color: string; bg: string }> = {
  compiler: { icon: Orbit, color: "text-primary/70", bg: "bg-primary/8" },
  planner: { icon: FileText, color: "text-primary/70", bg: "bg-primary/8" },
  organization: { icon: Orbit, color: "text-success/70", bg: "bg-success/8" },
  risk: { icon: Scale, color: "text-violet-400/70", bg: "bg-violet-400/8" },
  decision: { icon: Scale, color: "text-violet-400/70", bg: "bg-violet-400/8" },
  devils_advocate: { icon: Activity, color: "text-cyan-400/70", bg: "bg-cyan-400/8" },
  dashboard: { icon: FileText, color: "text-primary/70", bg: "bg-primary/8" },
};

const defaultIcon = { icon: Zap, color: "text-warning/70", bg: "bg-warning/8" };

function stageLabel(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LiveActivity() {
  const sseEvents = useSSEStore((s) => s.events);
  const connected = useSSEStore((s) => s.connected);

  const events = useMemo(() => {
    return sseEvents.slice(-15).map((e) => {
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
      className="enterprise-panel p-5"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground/80">Live Activity</h2>
          <div className="flex items-center gap-1.5">
            <PulseRing
              active={connected}
              color={connected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
              size={6}
            />
            <span className="text-[10px] text-muted-foreground/40">{connected ? "Live" : "Disconnected"}</span>
          </div>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground/50">No activity yet. Start a pipeline run to see live events.</p>
        ) : (
          <div className="space-y-0.5">
            {events.slice(0, 15).map((event, i) => {
              const Icon = event.Icon;
              return (
                <motion.div
                  key={`${event.time}-${i}`}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="group/event flex items-start gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-muted/20"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${event.bg} border border-border/10 transition-transform duration-200 group-hover/event:scale-105`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${event.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground/70">{event.label}</span>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground/30">
                        {event.time}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground/50">{event.detail}</p>
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
