"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useSSEStore } from "@/store/sse-store";
import { useTimelineStore } from "@/store/execution-stores";
import { useEventsQuery } from "@/hooks/use-api";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { Search, ChevronRight, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface StageGroup {
  name: string;
  status: string;
  events: Array<{ status: string; message: string; timestamp: string | null; progress?: number }>;
  startedAt: string | null;
  completedAt: string | null;
}

interface RawEvent {
  stage?: string;
  type?: string;
  status?: string;
  timestamp?: string | null;
  message?: string;
  progress?: number;
  [key: string]: unknown;
}

function groupByStage(source: RawEvent[]): StageGroup[] {
  if (!source.length) return [];

  const raw = source as Array<Record<string, unknown>>;
  const map = new Map<string, StageGroup>();

  for (const ev of raw) {
    const stage = (ev.stage ?? ev.type ?? "unknown") as string;
    if (stage === "pipeline") continue;
    if (!map.has(stage)) {
      map.set(stage, { name: stage, status: "pending", events: [], startedAt: null, completedAt: null });
    }
    const group = map.get(stage)!;
    const status = (ev.status ?? "") as string;
    const ts = (ev.timestamp ?? null) as string | null;
    const msg = (ev.message ?? "") as string;

    group.events.push({
      status, message: msg,
      timestamp: ts,
      progress: (ev.progress ?? 0) as number,
    });

    if (status === "started" && !group.startedAt) group.startedAt = ts;
    if (status === "completed") { group.completedAt = ts; group.status = "completed"; }
    else if (status === "error") { group.status = "error"; }
    else if (status === "started" && group.status === "pending") group.status = "started";
  }

  return Array.from(map.values());
}

function stageDuration(group: StageGroup): string {
  if (!group.startedAt || !group.completedAt) return "—";
  const diff = new Date(group.completedAt).getTime() - new Date(group.startedAt).getTime();
  const s = Math.floor(diff / 1000);
  return s > 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

const stageDisplayNames: Record<string, string> = {
  compiler: "Compilation",
  readiness: "Readiness Assessment",
  planner: "Planning",
  organization: "Organization",
  risk: "Risk Analysis",
  resource_gap: "Resource Gap Analysis",
  decision: "Decision Engine",
  devils_advocate: "Devil's Advocate Review",
  success_probability: "Success Probability",
  dependency_graph: "Dependency Graph",
  bottleneck: "Bottleneck Detection",
  dashboard: "Dashboard Aggregation",
  scenario: "Scenario Simulation",
};

const stageOrder = [
  "compiler", "readiness", "planner", "organization",
  "risk", "resource_gap",
  "decision", "devils_advocate", "success_probability", "dependency_graph", "bottleneck",
  "dashboard", "scenario",
];

export function TimelinePanel() {
  const searchParams = useSearchParams();
  const objectiveId = searchParams.get("id");
  const sseEvents = useSSEStore((s) => s.events);
  const ssePipelineStatus = useSSEStore((s) => s.pipelineStatus);
  const { data: persistedEvents } = useEventsQuery(objectiveId);
  const { searchQuery, setSearchQuery } = useTimelineStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  const groups = useMemo(() => {
    const source = sseEvents.length > 0 ? sseEvents : (persistedEvents ?? []);
    return groupByStage(source as RawEvent[])
      .sort((a, b) => stageOrder.indexOf(a.name) - stageOrder.indexOf(b.name));
  }, [sseEvents, persistedEvents]);

  // Auto-expand running stage — only when it changes
  useEffect(() => {
    const running = groups.find(g => g.status === "started");
    if (running && !expandedRef.current.has(running.name)) {
      setExpanded(prev => new Set(prev).add(running.name));
    }
  }, [groups]);

  const toggleExpanded = useCallback((name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter(g =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.events.some(e => e.message.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [groups, searchQuery]);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  const activeCount = sseEvents.filter(e => e.status === "started" || e.status === "progress").length;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border/40 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold tracking-tight text-foreground/80">Stages</h3>
            {activeCount > 0 && (
              <span className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                {activeCount} active
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/50">{groups.length} total</span>
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter stages..."
            className="w-full rounded-md border border-border/30 bg-muted/20 py-1.5 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
          />
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin" onScroll={e => {
        const el = e.currentTarget;
        setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
      }}>
        <div className="divide-y divide-border/20">
          <AnimatePresence initial={false}>
            {filtered.map((group) => {
              const isExpanded = expanded.has(group.name);
              const isRunning = group.status === "started";
              const isComplete = group.status === "completed";
              const isFailed = group.status === "error";
              const label = stageDisplayNames[group.name] ?? group.name.charAt(0).toUpperCase() + group.name.slice(1);
              const dur = stageDuration(group);

              return (
                <motion.div
                  key={group.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    onClick={() => toggleExpanded(group.name)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/10"
                  >
                    <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform", isExpanded && "rotate-90")} />
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isRunning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : isComplete ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : isFailed ? (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[11px] font-medium leading-tight",
                          isRunning ? "text-primary" : isComplete ? "text-emerald-400" : isFailed ? "text-red-400" : "text-foreground/70"
                        )}>{label}</span>
                        {dur !== "—" && (
                          <span className="font-mono text-[9px] tabular-nums text-muted-foreground/50">{dur}</span>
                        )}
                      </div>
                      {isRunning && group.events.length > 0 && (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
                          {group.events[group.events.length - 1]?.message ?? ""}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={group.status} size="sm" />
                  </button>

                  <AnimatePresence>
                    {isExpanded && group.events.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="border-l-2 border-border/20 ml-[26px] pl-4 pb-2 space-y-1">
                          {group.events.map((ev, i) => (
                            <div key={i} className="flex items-start gap-2 py-0.5">
                              <span className={cn(
                                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                ev.status === "started" ? "bg-primary" :
                                ev.status === "completed" ? "bg-emerald-400" :
                                ev.status === "error" ? "bg-red-400" : "bg-muted-foreground/30"
                              )} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] leading-tight text-muted-foreground/80">{ev.message}</p>
                                {ev.timestamp && (
                                  <span className="font-mono text-[9px] tabular-nums text-muted-foreground/40">
                                    {new Date(ev.timestamp).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                              {ev.progress !== undefined && ev.progress > 0 && (
                                <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground/50">{ev.progress}%</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/30 px-3 py-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
          <span>{groups.length} stages · {(sseEvents.length || persistedEvents?.length || 0)} events</span>
          <span className={cn("font-mono tabular-nums", ssePipelineStatus === "completed" || (!sseEvents.length && persistedEvents?.length) ? "text-emerald-400" : ssePipelineStatus === "error" ? "text-red-400" : "text-primary")}>
            {ssePipelineStatus === "completed" ? "Done" : ssePipelineStatus === "error" ? "Failed" : sseEvents.length > 0 ? "Running" : persistedEvents?.length ? "Done" : "Idle"}
          </span>
        </div>
      </div>
    </div>
  );
}
