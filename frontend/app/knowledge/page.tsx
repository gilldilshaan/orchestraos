"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { type Memory, type MemorySearchRequest } from "@/types";
import { EmptyState } from "@/components/empty-state";
import { PremiumCard } from "@/components/premium/premium-card";
import { PageHeader } from "@/components/page-header";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Loader2,
  Brain,
  Tag,
  Target,
  Calendar,
  Settings,
  Download,
  RefreshCw,
  Zap,
  Lightbulb,
} from "lucide-react";
import { SegmentedControl } from "@/components/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

interface MemoryFilters {
  query: string;
  status: string;
  tag: string;
  minConfidence: number;
  dateRange: string;
  sortBy: "relevance" | "confidence" | "recency" | "usage";
  objective_id?: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "completed", label: "Completed" },
  { value: "executing", label: "Executing" },
  { value: "planning", label: "Planning" },
  { value: "failed", label: "Failed" },
  { value: "draft", label: "Draft" },
];

const TAG_OPTIONS = [
  { value: "all", label: "All Tags" },
  { value: "auto-generated", label: "Auto-generated" },
  { value: "has-lessons", label: "Has Lessons" },
  { value: "has-strategies", label: "Has Strategies" },
  { value: "status:completed", label: "Status: Completed" },
  { value: "risk:financial", label: "Risk: Financial" },
  { value: "risk:timeline", label: "Risk: Timeline" },
  { value: "risk:technical", label: "Risk: Technical" },
  { value: "risk:team", label: "Risk: Team" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "confidence", label: "Confidence" },
  { value: "recency", label: "Most Recent" },
  { value: "usage", label: "Most Referenced" },
];

const DEFAULT_FILTERS: MemoryFilters = {
  query: "",
  status: "all",
  tag: "all",
  minConfidence: 0,
  dateRange: "all",
  sortBy: "relevance",
};

function MemoryCard({ memory }: { memory: Memory }) {
  const content = memory.content;
  const tags = memory.tags || [];
  const confidence = memory.confidence ?? 0;

  const getStatusBadge = () => {
    const statusTag = tags.find(t => t.startsWith("status:"));
    if (statusTag) {
      const status = statusTag.split(":")[1];
      return (
        <Badge variant={status === "completed" ? "default" : status === "executing" ? "secondary" : "destructive"} className="text-xs">
          {status}
        </Badge>
      );
    }
    return null;
  };

  const getRiskTags = () => {
    return tags.filter(t => t.startsWith("risk:")).slice(0, 3).map(t => (
      <Badge key={t} variant="outline" className="text-xs gap-1">
        <Zap className="h-2.5 w-2.5" />
        {t.split(":")[1]}
      </Badge>
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group p-5 rounded-xl border border-border/30 bg-background/50 hover:border-border/60 hover:bg-background/70 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary/70" />
            <span className="font-mono text-[10px] text-muted-foreground/50">{memory.id.slice(0, 8)}</span>
            {getStatusBadge()}
          </div>
          <h3 className="text-base font-semibold text-foreground line-clamp-1 mb-1">
            {content?.summary || "Untitled Memory"}
          </h3>
          <p className="text-sm text-muted-foreground/60 line-clamp-2">
            {content?.strategy || "No strategy recorded"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <span className={cn(
              "flex items-center justify-center w-12 h-6 rounded-full text-xs font-medium",
              confidence >= 0.8 ? "bg-green-500/15 text-green-500" :
              confidence >= 0.6 ? "bg-amber-500/15 text-amber-500" :
              "bg-red-500/15 text-red-500"
            )}>
              {Math.round(confidence * 100)}%
            </span>
            <Target className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground/30" />
          </div>
        </div>
      </div>

      {content && (
        <div className="space-y-3 mb-4">
          {(content.lessons_learned?.length || 0) > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Lightbulb className="h-3 w-3" />
              <span>{content.lessons_learned.length} lesson{content.lessons_learned.length !== 1 ? "s" : ""}</span>
            </div>
          )}
          {(content.risks?.length || 0) > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Zap className="h-3 w-3" />
              <span>{content.risks.length} risk{content.risks.length !== 1 ? "s" : ""} identified</span>
            </div>
          )}
          {(content.success_factors?.length || 0) > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Target className="h-3 w-3" />
              <span>{content.success_factors.length} success factor{content.success_factors.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.filter(t => !t.startsWith("status:") && !t.startsWith("risk:")).slice(0, 4).map(tag => (
          <Badge key={tag} variant="outline" className="text-[10px] h-5 px-2">
            {tag}
          </Badge>
        ))}
        {getRiskTags()}
        {tags.length > 4 && (
          <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground/50">
            +{tags.length - 4}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/20">
        <span className="text-xs text-muted-foreground/50">
          Updated {formatDistanceToNow(new Date(memory.updated_at))}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="View details">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

function MemorySearchBar({ filters, onFiltersChange }: { filters: MemoryFilters; onFiltersChange: (f: Partial<MemoryFilters> | ((prev: MemoryFilters) => MemoryFilters)) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="Search memories... (semantic search)"
          value={filters.query}
          onChange={(e) => onFiltersChange(prev => ({ ...prev, query: e.target.value }))}
          className="pl-10 pr-10"
        />
        {filters.query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onFiltersChange(prev => ({ ...prev, query: "" }))}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <SegmentedControl
          value={filters.sortBy}
          onChange={(v) => onFiltersChange(prev => ({ ...prev, sortBy: v as MemoryFilters["sortBy"] }))}
          options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          className="hidden sm:flex"
        />

        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <Select value={filters.status} onValueChange={v => onFiltersChange(prev => ({ ...prev, status: v }))}>
            <SelectTrigger className="w-auto min-w-[140px] hidden md:flex">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.tag} onValueChange={v => onFiltersChange(prev => ({ ...prev, tag: v }))}>
            <SelectTrigger className="w-auto min-w-[160px] hidden lg:flex">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              {TAG_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.dateRange} onValueChange={v => onFiltersChange(prev => ({ ...prev, dateRange: v }))}>
            <SelectTrigger className="w-auto min-w-[140px]">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="advanced-filters"
        >
          <Filter className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="advanced-filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2 border-t border-border/20"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Min Confidence</label>
                <Input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={filters.minConfidence}
                  onChange={(e) => onFiltersChange(prev => ({ ...prev, minConfidence: Number(e.target.value) }))}
                  className="w-40"
                  aria-label="Minimum confidence"
                />
                <span className="text-xs text-muted-foreground w-10 text-right">{filters.minConfidence}%</span>
              </div>
              <Button variant="outline" onClick={() => onFiltersChange(DEFAULT_FILTERS)} className="text-xs">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function KnowledgePage() {
  const [filters, setFilters] = useState<MemoryFilters>(DEFAULT_FILTERS);
  const [selectedMemories, setSelectedMemories] = useState<string[]>([]);

  const fetchMemories = useCallback(async ({ pageParam = 0 }) => {
    const params = new URLSearchParams();
    params.set("skip", String(pageParam * 20));
    params.set("limit", "20");
    if (filters.objective_id) params.set("objective_id", filters.objective_id);
    // Note: The API doesn't support all these filters server-side yet
    // Client-side filtering will be applied after fetch
    const response = await apiClient.get<{ data: Memory[] }>(`/memory?${params.toString()}`);
    return response.data;
  }, [filters]);

  const { data: memories = [], isLoading, error, refetch } = useQuery({
    queryKey: ["memories", filters],
    queryFn: () => fetchMemories({ pageParam: 0 }),
    staleTime: 30_000,
  });

  // Client-side filtering
  const filteredMemories = memories.filter(m => {
    if (filters.status !== "all") {
      const statusTag = m.tags?.find(t => t.startsWith("status:"));
      if (statusTag?.split(":")[1] !== filters.status) return false;
    }
    if (filters.tag !== "all" && !m.tags?.includes(filters.tag)) return false;
    if (filters.minConfidence > 0 && (m.confidence ?? 0) < filters.minConfidence / 100) return false;
    if (filters.dateRange !== "all") {
      const days = filters.dateRange === "7d" ? 7 : filters.dateRange === "30d" ? 30 : filters.dateRange === "90d" ? 90 : 365;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      if (new Date(m.updated_at) < cutoff) return false;
    }
    if (filters.query) {
      const searchText = `${m.content?.summary || ""} ${m.content?.strategy || ""} ${m.tags?.join(" ") || ""}`.toLowerCase();
      if (!searchText.includes(filters.query.toLowerCase())) return false;
    }
    return true;
  });

  // Sort client-side
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    switch (filters.sortBy) {
      case "confidence": return Number(b.confidence ?? 0) - Number(a.confidence ?? 0);
      case "recency": return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "usage": return Number(b.metadata?.usage_count ?? 0) - Number(a.metadata?.usage_count ?? 0);
      default: return 0;
    }
  });

  const handleSelectionChange = (ids: string[]) => setSelectedMemories(ids);

  // Wrapper to convert partial updates to setState function form
  const handleFilterChange = (partial: Partial<MemoryFilters> | ((prev: MemoryFilters) => MemoryFilters)) => {
    if (typeof partial === "function") {
      setFilters(partial);
    } else {
      setFilters(prev => ({ ...prev, ...partial }));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Memory Explorer"
        description="Search and explore organizational memories from past objectives"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        }
      />

      <PremiumCard className="flex-1 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border/30">
          <MemorySearchBar filters={filters} onFiltersChange={handleFilterChange} />
        </div>

        <div className="flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <EmptyState
              icon={<Brain className="h-12 w-12 text-muted-foreground/30" />}
              title="Failed to load memories"
              description={(error as Error).message}
              action={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : sortedMemories.length === 0 ? (
            <EmptyState
              icon={<Brain className="h-12 w-12 text-muted-foreground/30" />}
              title="No memories found"
              description="Adjust your filters or wait for pipeline completions to generate memories automatically."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedMemories.map(memory => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/30 flex items-center justify-between text-sm text-muted-foreground">
          <span>{sortedMemories.length} of {memories.length} memories</span>
          {selectedMemories.length > 0 && (
            <span className="text-primary">{selectedMemories.length} selected</span>
          )}
        </div>
      </PremiumCard>
    </div>
  );
}