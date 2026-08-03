"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  type TimelineResponse,
  type TimelineEvent,
  type TimelineEventType,
  type Memory,
} from "@/types";
import { PageHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { EmptyState } from "@/components/empty-state";
import { MemoryDetailModal } from "@/components/knowledge/memory-detail-modal";
import {
  Search,
  X,
  Loader2,
  Plus,
  TrendingUp,
  Repeat,
  Pencil,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 30;

const EVENT_META: Record<
  TimelineEventType,
  { icon: typeof Plus; label: string; className: string }
> = {
  created: {
    icon: Plus,
    label: "Created",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  retrieved: {
    icon: TrendingUp,
    label: "Retrieved",
    className: "border-blue-500/25 bg-blue-500/10 text-blue-500",
  },
  reused: {
    icon: Repeat,
    label: "Reused",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-500",
  },
  updated: {
    icon: Pencil,
    label: "Updated",
    className: "border-violet-500/25 bg-violet-500/10 text-violet-500",
  },
  execution_completed: {
    icon: CheckCircle2,
    label: "Execution completed",
    className: "border-success/25 bg-success/10 text-success",
  },
};

function groupByDay(events: TimelineEvent[]): Array<{ day: string; events: TimelineEvent[] }> {
  const map = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const day = ev.timestamp ? ev.timestamp.slice(0, 10) : "unknown";
    const list = map.get(day) ?? [];
    list.push(ev);
    map.set(day, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, dayEvents]) => ({ day, events: dayEvents }));
}

function DayGroup({
  day,
  events,
  onOpenMemory,
}: {
  day: string;
  events: TimelineEvent[];
  onOpenMemory: (memoryId: string) => void;
}) {
  const date = new Date(day + "T00:00:00");
  const label = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const isToday = day === new Date().toISOString().slice(0, 10);

  return (
    <div className="relative">
      <div className="sticky top-0 z-[1] -mx-1 flex items-center gap-2 rounded-md bg-background/80 px-1 py-1.5 backdrop-blur-sm">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
          {label}
        </span>
        {isToday && <Badge variant="outline" className="h-4 text-[9px]">today</Badge>}
        <span className="h-px flex-1 bg-border/20" />
        <span className="text-[10px] text-muted-foreground/40">{events.length} event{events.length === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-2 space-y-2">
        {events.map((ev) => {
          const meta = EVENT_META[ev.type] ?? EVENT_META.created;
          const Icon = meta.icon;
          const time = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex gap-3"
            >
              <span className="absolute left-[15px] top-8 bottom-[-8px] w-px bg-border/15" />
              <span className={cn("relative z-[1] mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border", meta.className)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div
                className="min-w-0 flex-1 rounded-lg border border-border/20 bg-background/40 p-3 transition-colors group-hover:border-border/40"
                role={ev.memory_id ? "button" : undefined}
                tabIndex={ev.memory_id ? 0 : undefined}
                onClick={ev.memory_id ? () => onOpenMemory(ev.memory_id!) : undefined}
                onKeyDown={ev.memory_id ? (e) => { if (e.key === "Enter" && ev.memory_id) onOpenMemory(ev.memory_id); } : undefined}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[12px] font-medium text-foreground/80">{ev.title}</p>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground/40">{time}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground/50">
                  {ev.objective_summary || "No objective summary"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {ev.department.length > 0 && (
                    <Badge variant="outline" className="h-4 text-[9px] text-muted-foreground/60">
                      {ev.department.join(", ")}
                    </Badge>
                  )}
                  {ev.category && (
                    <Badge variant="outline" className="h-4 text-[9px] text-muted-foreground/60">
                      {ev.category}
                    </Badge>
                  )}
                  {ev.status && ev.type !== "execution_completed" && (
                    <Badge variant="outline" className="h-4 text-[9px] text-muted-foreground/60">
                      {ev.status}
                    </Badge>
                  )}
                  {ev.confidence != null && (
                    <span className="text-[9px] text-muted-foreground/40">
                      {Math.round(ev.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "risk", label: "Risk" },
  { value: "lessons", label: "Lessons" },
  { value: "success", label: "Success" },
  { value: "outcome", label: "Outcome" },
  { value: "general", label: "General" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "executing", label: "Executing" },
  { value: "planning", label: "Planning" },
  { value: "failed", label: "Failed" },
];

function MemoryViewer({ memoryId, onClose }: { memoryId: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["memory", memoryId],
    queryFn: () => apiClient.get<Memory>(`/memory/${memoryId}`),
    enabled: Boolean(memoryId),
    staleTime: 60_000,
  });
  return <MemoryDetailModal memory={data ?? null} onClose={onClose} />;
}

export default function KnowledgeTimelinePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    if (category) p.set("category", category);
    if (status) p.set("status", status);
    if (startDate) p.set("start_date", startDate);
    if (endDate) p.set("end_date", endDate);
    p.set("skip", String(page * PAGE_SIZE));
    p.set("limit", String(PAGE_SIZE));
    return p.toString();
  }, [search, category, status, startDate, endDate, page]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["knowledge-timeline", params],
    queryFn: () => apiClient.get<TimelineResponse>(`/memory/timeline?${params}`),
    staleTime: 30_000,
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = useCallback(() => {
    setSearch("");
    setCategory("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(0);
  }, []);

  const hasActiveFilters = Boolean(search || category || status || startDate || endDate);

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        kicker="Knowledge Center"
        title="Knowledge Timeline"
        description="The full lifecycle of organizational memory — when memories are created, retrieved, reused, and updated."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <PremiumCard className="flex-1 overflow-hidden flex flex-col">
        <div className="space-y-3 border-b border-border/30 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            <Input
              placeholder="Filter events by title or objective summary…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10 pr-9"
              aria-label="Search timeline"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                  className="w-[150px] pl-8 text-[11px]"
                  aria-label="Start date"
                />
              </div>
              <span className="text-[10px] text-muted-foreground/40">to</span>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                  className="w-[150px] pl-8 text-[11px]"
                  aria-label="End date"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12 text-muted-foreground/30" />}
              title="Failed to load timeline"
              description={(error as Error).message}
              action={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12 text-muted-foreground/30" />}
              title="No events match"
              description={hasActiveFilters ? "Try widening the filters or clearing the search." : "Memory lifecycle events will appear here once memories are created and reused."}
            />
          ) : (
            <div className="mx-auto max-w-3xl space-y-8">
              {groupByDay(events).map((group) => (
                <DayGroup
                  key={group.day}
                  day={group.day}
                  events={group.events}
                  onOpenMemory={(memoryId) => setSelectedMemoryId(memoryId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border/30 p-4 text-xs text-muted-foreground">
          <span>
            Showing {events.length} of {total} events
            {hasActiveFilters ? " (filtered)" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              disabled={page === 0 || isLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono text-[10px] text-muted-foreground/50">
              page {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              disabled={page >= totalPages - 1 || isLoading}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </PremiumCard>

      <MemoryViewer memoryId={selectedMemoryId} onClose={() => setSelectedMemoryId(null)} />
    </div>
  );
}
