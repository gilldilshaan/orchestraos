"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  type GlobalSearchResponse,
  type GlobalSearchGroups,
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
  Target,
  BookOpen,
  Lightbulb,
  Zap,
  Scale,
  Tag,
  Brain,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const GROUP_CONFIG = [
  {
    key: "objectives" as const,
    label: "Objectives",
    icon: Target,
    tone: "text-primary bg-primary/10 border-primary/20",
    description: "Objective memories matching the query",
  },
  {
    key: "strategies" as const,
    label: "Strategies",
    icon: BookOpen,
    tone: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    description: "Reusable strategies",
  },
  {
    key: "lessons" as const,
    label: "Lessons",
    icon: Lightbulb,
    tone: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    description: "Lessons learned with context",
  },
  {
    key: "risks" as const,
    label: "Risks",
    icon: Zap,
    tone: "text-destructive bg-destructive/10 border-destructive/20",
    description: "Identified risks and mitigations",
  },
  {
    key: "decisions" as const,
    label: "Decisions",
    icon: Scale,
    tone: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    description: "Executive decisions and rationale",
  },
  {
    key: "tags" as const,
    label: "Tags",
    icon: Tag,
    tone: "text-muted-foreground bg-muted/20 border-border/20",
    description: "Matching memory tags",
  },
  {
    key: "memories" as const,
    label: "Memories",
    icon: Brain,
    tone: "text-primary bg-primary/10 border-primary/20",
    description: "Whole memories matching the query",
  },
] as const;

function GroupSection<K extends keyof GlobalSearchGroups>({
  groupKey,
  items,
  onOpenMemory,
}: {
  groupKey: K;
  items: GlobalSearchGroups[K];
  onOpenMemory: (memoryId: string) => void;
}) {
  const config = GROUP_CONFIG.find((g) => g.key === groupKey)!;
  const Icon = config.icon;
  const count = items.length;
  if (count === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", config.tone)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-foreground/85">
            {config.label}
            <span className="ml-2 font-mono text-[10px] text-muted-foreground/40">{count}</span>
          </p>
          <p className="text-[10px] text-muted-foreground/40">{config.description}</p>
        </div>
        <span className="h-px flex-1 bg-border/20" />
      </div>

      <div className="mt-2.5 space-y-2">
        {items.map((item) => {
          const key = String(item.id ?? Math.random());
          switch (groupKey) {
            case "objectives": {
              const it = item as GlobalSearchGroups["objectives"][number];
              return (
                <ResultRow
                  key={key}
                  title={it.title}
                  meta={`${it.objective_id.slice(0, 8)}… · created ${it.created_at ? new Date(it.created_at).toLocaleDateString() : "—"}`}
                  right={
                    it.confidence != null ? (
                      <Badge variant="outline" className="text-[10px]">
                        {Math.round(it.confidence * 100)}%
                      </Badge>
                    ) : undefined
                  }
                />
              );
            }
            case "strategies": {
              const it = item as GlobalSearchGroups["strategies"][number];
              return (
                <ResultRow
                  key={key}
                  title={it.strategy}
                  meta={`${it.objective_summary || it.objective_id.slice(0, 12)}…`}
                  right={<Badge variant="outline" className="text-[10px]">strategy</Badge>}
                />
              );
            }
            case "lessons": {
              const it = item as GlobalSearchGroups["lessons"][number];
              return (
                <ResultRow
                  key={key}
                  title={it.lesson}
                  meta={it.context || it.objective_summary || "No context"}
                />
              );
            }
            case "risks": {
              const it = item as GlobalSearchGroups["risks"][number];
              return (
                <ResultRow
                  key={key}
                  title={it.title}
                  meta={
                    it.mitigation
                      ? `Mitigation: ${it.mitigation}`
                      : it.description || "No description"
                  }
                  right={
                    it.materialized ? (
                      <Badge variant="destructive" className="text-[9px] h-4">materialized</Badge>
                    ) : undefined
                  }
                />
              );
            }
            case "decisions": {
              const it = item as GlobalSearchGroups["decisions"][number];
              return (
                <ResultRow
                  key={key}
                  title={it.title}
                  meta={it.description || it.objective_summary || "No description"}
                  right={<Badge variant="outline" className="text-[10px]">{it.impact}</Badge>}
                />
              );
            }
            case "tags": {
              const it = item as GlobalSearchGroups["tags"][number];
              return (
                <ResultRow
                  key={key}
                  title={it.tag}
                  meta={it.objective_summary || it.objective_id.slice(0, 12)}
                  right={<Badge variant="outline" className="text-[10px]">tag</Badge>}
                />
              );
            }
            case "memories": {
              const it = item as GlobalSearchGroups["memories"][number];
              return (
                <ResultRow
                  key={key}
                  title={it.title}
                  meta={`${it.objective_id.slice(0, 8)}… · ${it.created_at ? new Date(it.created_at).toLocaleDateString() : ""}`}
                  right={
                    it.confidence != null ? (
                      <Badge variant="outline" className="text-[10px]">
                        {Math.round(it.confidence * 100)}%
                      </Badge>
                    ) : undefined
                  }
                  onOpen={() => onOpenMemory(it.memory_id)}
                  actionLabel="View memory"
                />
              );
            }
            default:
              return null;
          }
        })}
      </div>
    </motion.section>
  );
}

function ResultRow({
  title,
  meta,
  right,
  onOpen,
  actionLabel,
}: {
  title: string;
  meta?: string;
  right?: React.ReactNode;
  onOpen?: () => void;
  actionLabel?: string;
}) {
  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onOpen ? (e) => { if (e.key === "Enter") onOpen(); } : undefined}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-background/40 px-3.5 py-2.5 transition-colors",
        onOpen ? "cursor-pointer hover:border-primary/25 hover:bg-background/70" : ""
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-foreground/80">{title}</p>
        {meta && <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/40">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        {actionLabel && onOpen && (
          <span className="text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            {actionLabel} →
          </span>
        )}
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 350);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["knowledge-global-search", debouncedQuery],
    queryFn: () =>
      apiClient.get<GlobalSearchResponse>(
        `/memory/global-search?q=${encodeURIComponent(debouncedQuery)}`
      ),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 30_000,
  });

  const { data: memory } = useQuery({
    queryKey: ["memory", selectedMemoryId],
    queryFn: () => apiClient.get<Memory>(`/memory/${selectedMemoryId}`),
    enabled: Boolean(selectedMemoryId),
    staleTime: 60_000,
  });

  const total = data?.total ?? 0;
  const groups = data?.groups;
  const hasQuery = debouncedQuery.trim().length > 0;

  const nonEmptyGroups = useMemo(() => {
    if (!groups) return [];
    return GROUP_CONFIG.filter((g) => (groups[g.key]?.length ?? 0) > 0);
  }, [groups]);

  const active = query.trim().length > 0;
  const searching = isLoading || isFetching;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        kicker="Knowledge Center"
        title="Global Search"
        description="One query across every objective, strategy, lesson, risk, decision, and tag in organizational memory."
      />

      <PremiumCard className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b border-border/30 p-5">
          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            <Input
              placeholder="Search everything… e.g. vendor risk, migration, compliance"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="h-11 pl-10 pr-10"
              aria-label="Global search"
            />
            {active && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {!hasQuery ? (
            <EmptyState
              icon={<ScanSearch className="h-12 w-12 text-muted-foreground/30" />}
              title="Search across all organizational knowledge"
              description="Results are grouped by type — objectives, strategies, lessons, risks, decisions, tags, and full memories."
              className="mx-auto max-w-xl"
            />
          ) : searching ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <EmptyState
              icon={<Search className="h-12 w-12 text-muted-foreground/30" />}
              title="Search failed"
              description={(error as Error).message}
              action={<Button onClick={() => refetch()} variant="outline">Retry</Button>}
            />
          ) : total === 0 ? (
            <EmptyState
              icon={<Search className="h-12 w-12 text-muted-foreground/30" />}
              title={`No results for “${debouncedQuery.trim()}”`}
              description="Try a different keyword — search matches objectives, strategies, lessons, risks, decisions, and tags."
            />
          ) : (
            <div className="mx-auto max-w-3xl space-y-8">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
                <Brain className="h-3.5 w-3.5" />
                {total} result{total === 1 ? "" : "s"} for “{data?.query}” across{" "}
                {nonEmptyGroups.length} categor{nonEmptyGroups.length === 1 ? "y" : "ies"}
              </p>
              <AnimatePresence mode="popLayout">
                {GROUP_CONFIG.map((group) => (
                  <GroupSection
                    key={group.key}
                    groupKey={group.key}
                    items={groups?.[group.key] ?? []}
                    onOpenMemory={(memoryId) => setSelectedMemoryId(memoryId)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </PremiumCard>

      <MemoryDetailModal memory={memory ?? null} onClose={() => setSelectedMemoryId(null)} />
    </div>
  );
}
