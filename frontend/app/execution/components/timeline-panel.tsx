"use client";

import { useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useExecutionEvents } from "@/hooks/use-execution";
import { useTimelineStore } from "@/store/execution-stores";
import { cn } from "@/lib/utils";
import type { FC, SVGProps } from "react";
type IconType = FC<SVGProps<SVGSVGElement>>;
import {
  Search, Pause, Play, Orbit, UserCheck, FileText, Scale,
  Activity, Zap, AlertCircle, Loader2,
} from "lucide-react";

const CheckIcon: IconType = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const eventIconMap: Record<string, IconType> = {
  organization_created: Orbit,
  node_created: UserCheck,
  task_started: Loader2,
  task_completed: CheckIcon,
  node_executing: Loader2,
  node_completed: CheckIcon,
  node_failed: AlertCircle,
  node_retry: Zap,
  executive_report: FileText,
  specialist_report: FileText,
  supervisor_analysis: Activity,
  decision_created: Scale,
  run_started: Play,
  run_completed: CheckIcon,
  run_failed: AlertCircle,
};

const eventColorMap: Record<string, string> = {
  planning: "text-blue-400 bg-blue-400/10",
  execution: "text-cyan-400 bg-cyan-400/10",
  reporting: "text-violet-400 bg-violet-400/10",
  supervisor: "text-orange-400 bg-orange-400/10",
  decision: "text-green-400 bg-green-400/10",
  failure: "text-red-400 bg-red-400/10",
  retry: "text-amber-400 bg-amber-400/10",
};

const componentColorMap: Record<string, string> = {
  Orchestrator: "text-primary bg-primary/10",
  Compiler: "text-blue-400 bg-blue-400/10",
  CEO: "text-violet-400 bg-violet-400/10",
  OrgGenerator: "text-cyan-400 bg-cyan-400/10",
  CTO: "text-emerald-400 bg-emerald-400/10",
  CFO: "text-amber-400 bg-amber-400/10",
  COO: "text-orange-400 bg-orange-400/10",
  CMO: "text-pink-400 bg-pink-400/10",
  CPO: "text-indigo-400 bg-indigo-400/10",
  Supervisor: "text-yellow-400 bg-yellow-400/10",
  DecisionMaker: "text-green-400 bg-green-400/10",
};

export function TimelinePanel() {
  const { events, paused } = useExecutionEvents();
  const { searchQuery, setSearchQuery, paused: sp, togglePaused } = useTimelineStore();
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (searchQuery && !e.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      }),
    [events, searchQuery]
  );

  useEffect(() => {
    if (!sp && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filtered.length, sp]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-tight">Timeline</h3>
          <button
            onClick={togglePaused}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {sp ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter events..."
            className="w-full rounded-md border border-border/50 bg-muted/30 py-1.5 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Event list */}
      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {filtered.map((event, i) => {
            const Icon = eventIconMap[event.type] ?? Activity;
            const colorClass = componentColorMap[event.component] ?? "text-muted-foreground bg-muted/50";
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group flex items-start gap-2.5 border-b border-border/20 px-4 py-2.5 transition-colors hover:bg-muted/20",
                  i === 0 && !sp && "bg-primary/[0.02]"
                )}
              >
                <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", colorClass)}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground/90">
                      {event.component}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80 truncate">
                    {event.description || event.message}
                  </p>
                  {event.confidence !== undefined && (
                    <span className="mt-0.5 inline-flex text-[10px] text-muted-foreground/60">
                      Confidence: {(event.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer count */}
      <div className="shrink-0 border-t border-border/50 px-4 py-2 text-[10px] text-muted-foreground">
        {filtered.length} events
      </div>
    </div>
  );
}
