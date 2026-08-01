"use client";

import { useMemo, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { useSSEStore } from "@/store/sse-store";
import { Orbit, FileText, Scale, Activity, Zap, Radio, Terminal } from "lucide-react";
import { PulseRing } from "@/components/premium/page-transition";
import { cn } from "@/lib/utils";

const stageIcons: Record<string, { icon: typeof Orbit; color: string }> = {
  compiler: { icon: Orbit, color: "text-primary" },
  planner: { icon: FileText, color: "text-primary" },
  organization: { icon: Orbit, color: "text-success" },
  risk: { icon: Scale, color: "text-violet-400" },
  decision: { icon: Scale, color: "text-violet-400" },
  devils_advocate: { icon: Activity, color: "text-cyan-400" },
  dashboard: { icon: FileText, color: "text-primary" },
};

const defaultIcon = { icon: Zap, color: "text-warning" };

function stageLabel(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LiveActivity() {
  const sseEvents = useSSEStore((s) => s.events);
  const connected = useSSEStore((s) => s.connected);
  const progress = useSSEStore((s) => s.progress);
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = useMemo(() => {
    return sseEvents.slice(-15).map((e) => {
      const cfg = stageIcons[e.stage] ?? defaultIcon;
      return {
        Icon: cfg.icon,
        label: stageLabel(e.stage) + (e.status ? `: ${e.status}` : ""),
        detail: e.message,
        time: e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : "\u2014",
        color: cfg.color,
      };
    });
  }, [sseEvents]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Radio className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">Live Activity</span>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] tabular-nums text-primary">
            {sseEvents.length} evt
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <PulseRing
            active={connected}
            color={connected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            size={5}
          />
          <span className="text-[10px] text-muted-foreground/40">{connected ? "Live" : "Disconnected"}</span>
        </div>
      </div>
      <div className="panel-body max-h-[320px] overflow-y-auto p-0" ref={scrollRef}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/8"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Terminal className="h-4 w-4 text-primary/60" />
            </motion.div>
            <p className="font-mono text-xs text-muted-foreground/45">
              <span className="text-success/70">$</span> awaiting pipeline events...
            </p>
            <p className="text-[11px] text-muted-foreground/35">
              Start a run to stream live agent activity here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {events.slice(0, 15).map((event, i) => {
              const Icon = event.Icon;
              const isLatest = i === Math.min(events.length - 1, 14);
              return (
                <motion.div
                  key={`${event.time}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                  className={cn(
                    "group flex items-start gap-3 px-6 py-3 transition-colors hover:bg-muted/10",
                    isLatest && connected && "bg-primary/[0.03]"
                  )}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card/80 ${event.color} [&>svg]:h-3.5 [&>svg]:w-3.5`}>
                    <Icon className={event.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                        <span className={cn("font-mono text-[10px]", isLatest ? "text-success/80" : "text-muted-foreground/25")}>
                          {"$"}
                        </span>
                        {event.label}
                        {isLatest && connected && (
                          <motion.span
                            className="ml-0.5 inline-block h-3 w-[6px] bg-primary/70"
                            animate={{ opacity: [1, 0.15, 1] }}
                            transition={{ duration: 0.9, repeat: Infinity }}
                          />
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/25">
                        {event.time}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground/45">{event.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {events.length > 0 && connected && (
          <div className="sticky bottom-0 flex items-center gap-2 border-t border-border/10 bg-card/90 px-6 py-2 backdrop-blur">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-success"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="font-mono text-[10px] text-muted-foreground/45">
              streaming ┬╖ progress {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
