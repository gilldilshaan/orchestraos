"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { type Memory, type MemoryAnalytics } from "@/types";
import { PremiumCard } from "@/components/premium/premium-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  BookOpen,
  TrendingUp,
  Target,
  Lightbulb,
  Zap,
  Filter,
  Search,
  ChevronDown,
  ArrowUpDown,
  RefreshCw,
  Download,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Strategy {
  strategy: string;
  count: number;
  avgConfidence: number;
  successRate: number;
  lastUsed: string;
  objectives: string[];
  lessons: string[];
  risks: string[];
  successFactors: string[];
}

interface StrategyFilters {
  search: string;
  minUsage: number;
  minConfidence: number;
  minSuccessRate: number;
  sortBy: "usage" | "confidence" | "success" | "recency";
  category: string;
}

const SORT_OPTIONS = [
  { value: "usage", label: "Most Used" },
  { value: "confidence", label: "Highest Confidence" },
  { value: "success", label: "Highest Success Rate" },
  { value: "recency", label: "Most Recent" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "growth", label: "Growth" },
  { value: "execution", label: "Execution" },
  { value: "risk", label: "Risk Mitigation" },
  { value: "team", label: "Team Building" },
  { value: "technical", label: "Technical" },
  { value: "financial", label: "Financial" },
];

const DEFAULT_FILTERS: StrategyFilters = {
  search: "",
  minUsage: 0,
  minConfidence: 0,
  minSuccessRate: 0,
  sortBy: "usage",
  category: "all",
};

function StrategyCard({ strategy, rank }: { strategy: Strategy; rank: number }) {
  const lastUsedDate = new Date(strategy.lastUsed);
  const daysAgo = Math.floor((Date.now() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.05 }}
      className="group p-6 rounded-xl border border-border/30 bg-background/50 hover:border-border/60 hover:bg-background/70 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-lg",
            rank === 1 ? "bg-gradient-to-br from-amber-500 to-amber-600" :
            rank === 2 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
            rank === 3 ? "bg-gradient-to-br from-amber-700 to-amber-800" :
            "bg-gradient-to-br from-primary to-primary/80"
          )}>
            {rank}
          </div>
          <BookOpen className="h-5 w-5 text-primary/70 shrink-0" />
        </div>
        <Badge variant={strategy.count >= 10 ? "default" : strategy.count >= 5 ? "success" : "secondary"} className="text-xs">
          Used {strategy.count}x
        </Badge>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">{strategy.strategy}</h3>

      <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-muted/30">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{Math.round(strategy.avgConfidence * 100)}%</div>
          <div className="text-[10px] text-muted-foreground">Avg Confidence</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success">{Math.round(strategy.successRate * 100)}%</div>
          <div className="text-[10px] text-muted-foreground">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{strategy.objectives.length}</div>
          <div className="text-[10px] text-muted-foreground">Objectives</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-4">
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          Last used {daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`}
        </span>
      </div>

      <div className="space-y-3">
        {(strategy.lessons?.length || 0) > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <Lightbulb className="h-3 w-3" />
            <span>{strategy.lessons.length} lesson{strategy.lessons.length !== 1 ? "s" : ""}</span>
          </div>
        )}
        {(strategy.risks?.length || 0) > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <Zap className="h-3 w-3" />
            <span>{strategy.risks.length} risk{strategy.risks.length !== 1 ? "s" : ""}</span>
          </div>
        )}
        {(strategy.successFactors?.length || 0) > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <Target className="h-3 w-3" />
            <span>{strategy.successFactors.length} success factor{strategy.successFactors.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/20 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-xs">
          <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
          Details
        </Button>
        <Button variant="ghost" size="sm" className="text-xs">
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
          Compare
        </Button>
      </div>
    </motion.div>
  );
}

function StrategyFiltersBar({ filters, onFiltersChange }: { filters: StrategyFilters; onFiltersChange: (f: Partial<StrategyFilters> | ((prev: StrategyFilters) => StrategyFilters)) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (partial: Partial<StrategyFilters> | ((prev: StrategyFilters) => StrategyFilters)) => {
    if (typeof partial === "function") {
      onFiltersChange(partial);
    } else {
      onFiltersChange(prev => ({ ...prev, ...partial }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="Search strategies..."
          value={filters.search}
          onChange={(e) => handleChange({ search: e.target.value })}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filters.sortBy} onValueChange={v => handleChange({ sortBy: v as StrategyFilters["sortBy"] })}>
          <SelectTrigger className="w-auto min-w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={v => handleChange({ category: v })}>
          <SelectTrigger className="w-auto min-w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="strategy-advanced-filters"
        >
          <Filter className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="strategy-advanced-filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2 border-t border-border/20"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Min Usage Count</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={filters.minUsage}
                  onChange={(e) => handleChange({ minUsage: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Min Confidence %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={filters.minConfidence}
                  onChange={(e) => handleChange({ minConfidence: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Min Success Rate %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={filters.minSuccessRate}
                  onChange={(e) => handleChange({ minSuccessRate: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => handleChange(DEFAULT_FILTERS)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reset Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StrategiesPage() {
  const [filters, setFilters] = useState<StrategyFilters>(DEFAULT_FILTERS);

  const fetchStrategies = useCallback(async () => {
    // Fetch memories and derive strategies
    const response = await apiClient.get<{ data: Memory[] }>("/memory?limit=500");
    return response.data;
  }, []);

  const { data: memories = [], isLoading, error, refetch } = useQuery({
    queryKey: ["strategies", filters],
    queryFn: fetchStrategies,
    staleTime: 60_000,
  });

  // Derive strategies from memories
  const strategyMap = new Map<string, Strategy>();

  memories.forEach(memory => {
    if (!memory.content?.strategy) return;

    const key = memory.content.strategy.toLowerCase().trim();
    if (!key) return;

    const existing = strategyMap.get(key);
    const confidence = memory.confidence ?? 0;
    const isCompleted = memory.tags?.some(t => t === "status:completed") ?? false;

    if (existing) {
      existing.count += 1;
      existing.avgConfidence = (existing.avgConfidence * (existing.count - 1) + confidence) / existing.count;
      if (isCompleted) existing.successRate = (existing.successRate * (existing.count - 1) + 1) / existing.count;
      else existing.successRate = (existing.successRate * (existing.count - 1)) / existing.count;
      if (new Date(memory.updated_at) > new Date(existing.lastUsed)) {
        existing.lastUsed = memory.updated_at;
      }
      if (memory.objective_id && !existing.objectives.includes(memory.objective_id)) {
        existing.objectives.push(memory.objective_id);
      }
      memory.content.lessons_learned?.forEach(l => {
        if (l.lesson && !existing.lessons.includes(l.lesson)) existing.lessons.push(l.lesson);
      });
      memory.content.risks?.forEach(r => {
        if (r.title && !existing.risks.includes(r.title)) existing.risks.push(r.title);
      });
      memory.content.success_factors?.forEach(f => {
        if (f.factor && !existing.successFactors.includes(f.factor)) existing.successFactors.push(f.factor);
      });
    } else {
      strategyMap.set(key, {
        strategy: memory.content.strategy,
        count: 1,
        avgConfidence: confidence,
        successRate: isCompleted ? 1 : 0,
        lastUsed: memory.updated_at,
        objectives: memory.objective_id ? [memory.objective_id] : [],
        lessons: memory.content.lessons_learned?.map(l => l.lesson).filter(Boolean) || [],
        risks: memory.content.risks?.map(r => r.title).filter(Boolean) || [],
        successFactors: memory.content.success_factors?.map(f => f.factor).filter(Boolean) || [],
      });
    }
  });

  // Filter strategies
  let strategies = Array.from(strategyMap.values());

  if (filters.search) {
    const search = filters.search.toLowerCase();
    strategies = strategies.filter(s => 
      s.strategy.toLowerCase().includes(search) ||
      s.lessons.some(l => l.toLowerCase().includes(search)) ||
      s.risks.some(r => r.toLowerCase().includes(search)) ||
      s.successFactors.some(f => f.toLowerCase().includes(search))
    );
  }

  if (filters.minUsage > 0) {
    strategies = strategies.filter(s => s.count >= filters.minUsage);
  }

  if (filters.minConfidence > 0) {
    strategies = strategies.filter(s => s.avgConfidence >= filters.minConfidence / 100);
  }

  if (filters.minSuccessRate > 0) {
    strategies = strategies.filter(s => s.successRate >= filters.minSuccessRate / 100);
  }

  if (filters.category !== "all") {
    // Simple categorization based on keywords
    const catKeywords: Record<string, string[]> = {
      growth: ["growth", "scale", "expand", "market", "customer", "acquisition", "revenue"],
      execution: ["execute", "deliver", "implement", "build", "develop", "ship", "launch"],
      risk: ["risk", "mitigate", "avoid", "compliance", "security", "contingency"],
      team: ["team", "hire", "people", "culture", "organization", "leadership"],
      technical: ["technical", "architecture", "engineering", "tech", "infrastructure", "platform"],
      financial: ["budget", "cost", "financial", "roi", "investment", "funding", "profit"],
    };
    const keywords = catKeywords[filters.category] || [];
    strategies = strategies.filter(s =>
      keywords.some(k => s.strategy.toLowerCase().includes(k))
    );
  }

  // Sort strategies
  strategies.sort((a, b) => {
    switch (filters.sortBy) {
      case "usage": return b.count - a.count;
      case "confidence": return b.avgConfidence - a.avgConfidence;
      case "success": return b.successRate - a.successRate;
      case "recency": return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      default: return 0;
    }
  });

  // Wrapper to convert partial updates to setState function form
  const handleFilterChange = (partial: Partial<StrategyFilters> | ((prev: StrategyFilters) => StrategyFilters)) => {
    if (typeof partial === "function") {
      setFilters(partial);
    } else {
      setFilters(prev => ({ ...prev, ...partial }));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Strategy Library"
        description="Reusable strategies extracted from completed objectives, ranked by usage and success"
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
          <StrategyFiltersBar filters={filters} onFiltersChange={handleFilterChange} />
        </div>

        <div className="flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-muted-foreground/30" />}
              title="Failed to load strategies"
              description={(error as Error).message}
              action={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : strategies.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-muted-foreground/30" />}
              title="No strategies found"
              description="Run more pipeline completions to automatically generate strategies, or adjust your filters."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {strategies.map((strategy, index) => (
                <StrategyCard key={strategy.strategy} strategy={strategy} rank={index + 1} />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/30 flex items-center justify-between text-sm text-muted-foreground">
          <span>{strategies.length} strategies from {memories.length} memories</span>
          <span className="text-primary font-medium">
            Top: {strategies[0]?.strategy || "—"}
          </span>
        </div>
      </PremiumCard>
    </div>
  );
}