"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useSSEStore } from "@/store/sse-store";
import { Orbit, UserCheck, FileText, Scale, Activity, Zap, Radio } from "lucide-react";
import { PulseRing } from "@/components/premium/page-transition";

const stageIcons: Record<string, { icon: typeof Orbit; color: string; bg: string }> = {
  compiler: { icon: Orbit, color: "text-sky-400", bg: "bg-sky-400/10" },
  planner: { icon: FileText, color: "text-violet-400", bg: "bg-violet-400/10" },
  organization: { icon: Orbit, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  risk: { icon: Scale, color: "text-amber-400", bg: "bg-amber-400/10" },
  decision: { icon: Scale, color: "text-rose-400", bg: "bg-rose-400/10" },
  devils_advocate: { icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  dashboard: { icon: FileText, color: "text-indigo-400", bg: "bg-indigo-400/10" },
};

const defaultIcon = { icon: Zap, color: "text-muted-foreground/50", bg: "bg-muted/10" };

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
        time: e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : "\u2014",
        color: cfg.color,
        bg: cfg.bg,
      };
    });
  }, [sseEvents]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Radio className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">Live Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <PulseRing
            active={connected}
            color={connected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            size={5}
          />
          <span className="text-[10px] text-muted-foreground/40">{connected ? "Live" : "Disconnected"}</span>
        </div>
      </div>
      <div className="panel-body max-h-[380px] overflow-y-auto p-0">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-6">
            <div className="relative mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20">
                <Radio className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <motion.div
                className="pointer-events-none absolute -inset-2 rounded-2xl border border-border/10"
                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="text-sm font-medium text-foreground/60">No Activity Yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground/40 leading-relaxed">
              Start a pipeline run to see live events here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/5">
            {events.slice(0, 15).map((event, i) => {
              const Icon = event.Icon;
              return (
                <motion.div
                  key={`${event.time}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className="group/event flex items-start gap-3 px-6 py-3.5 transition-colors duration-200 hover:bg-muted/10"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${event.bg} border border-border/10 transition-transform duration-200 group-hover/event:scale-105`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${event.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground/70">{event.label}</span>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground/25">
                        {event.time}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground/45">{event.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
