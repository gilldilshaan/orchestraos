"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { type Memory } from "@/types";
import { PremiumCard } from "@/components/premium/premium-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Lightbulb,
  Target,
  Zap,
  BookOpen,
  Filter,
  Search,
  ChevronDown,
  RefreshCw,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Wrench,
  DollarSign,
  Users,
  BarChart,
  Globe,
  Shield,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Lesson {
  lesson: string;
  context: string;
  sourceObjectiveId: string;
  similarityScore: number;
  count: number;
  avgConfidence: number;
  categories: string[];
  lastSeen: string;
}

interface LessonFilters {
  search: string;
  category: string;
  minCount: number;
  minConfidence: number;
  sortBy: "frequency" | "confidence" | "recency" | "relevance";
}

const CATEGORIES = [
  { value: "all", label: "All", icon: Lightbulb },
  { value: "planning", label: "Planning", icon: Target },
  { value: "engineering", label: "Engineering", icon: Code },
  { value: "finance", label: "Finance", icon: DollarSign },
  { value: "marketing", label: "Marketing", icon: Globe },
  { value: "risk", label: "Risk", icon: AlertTriangle },
  { value: "operations", label: "Operations", icon: Wrench },
  { value: "team", label: "Team", icon: Users },
  { value: "technical", label: "Technical", icon: BarChart },
  { value: "compliance", label: "Compliance", icon: Shield },
];

const SORT_OPTIONS = [
  { value: "frequency", label: "Most Frequent" },
  { value: "confidence", label: "Highest Confidence" },
  { value: "recency", label: "Most Recent" },
  { value: "relevance", label: "Most Relevant" },
];

const DEFAULT_FILTERS: LessonFilters = {
  search: "",
  category: "all",
  minCount: 0,
  minConfidence: 0,
  sortBy: "frequency",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  planning: ["plan", "timeline", "milestone", "schedule", "roadmap", "scope", "phase", "deadline", "estimate"],
  engineering: ["code", "architecture", "technical", "engineer", "develop", "build", "refactor", "test", "deploy", "api", "database", "performance"],
  finance: ["budget", "cost", "financial", "roi", "investment", "funding", "revenue", "profit", "expense", "pricing"],
  marketing: ["market", "customer", "user", "launch", "campaign", "acquisition", "brand", "positioning", "growth", "conversion"],
  risk: ["risk", "mitigate", "contingency", "compliance", "security", "vulnerability", "threat", "audit", "regulation"],
  operations: ["operation", "process", "workflow", "automation", "monitoring", "incident", "oncall", "deployment", "infrastructure"],
  team: ["team", "hire", "people", "culture", "leadership", "communication", "collaboration", "meeting", "decision", "stakeholder"],
  technical: ["technical", "architecture", "infrastructure", "platform", "system", "service", "microservice", "scalability", "reliability"],
  compliance: ["compliance", "regulation", "audit", "policy", "governance", "legal", "privacy", "gdpr", "soc2", "hipaa"],
};

function categorizeLesson(lesson: string): string[] {
  const lower = lesson.toLowerCase();
  const categories: string[] = [];
  
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      categories.push(cat);
    }
  }
  
  return categories.length > 0 ? categories : ["general"];
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  planning: Target,
  engineering: Code,
  finance: DollarSign,
  marketing: Globe,
  risk: AlertTriangle,
  operations: Wrench,
  team: Users,
  technical: BarChart,
  compliance: Shield,
  general: Lightbulb,
};

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] || Lightbulb;
}

function LessonCard({ lesson, rank }: { lesson: Lesson; rank: number }) {
  const categories = lesson.categories.length > 0 ? lesson.categories : ["general"];
  const primaryCategory = categories[0];
  const Icon = getCategoryIcon(primaryCategory);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.03 }}
      className="group p-5 rounded-xl border border-border/30 bg-background/50 hover:border-border/60 hover:bg-background/70 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
            rank === 1 ? "bg-gradient-to-br from-amber-500 to-amber-600" :
            rank === 2 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
            rank === 3 ? "bg-gradient-to-br from-amber-700 to-amber-800" :
            "bg-primary/15 text-primary"
          )}>
            {rank <= 3 ? (
              <span className="font-bold text-white text-sm">{rank}</span>
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-2">{lesson.lesson}</p>
            <p className="text-xs text-muted-foreground/60 line-clamp-1 mt-0.5">{lesson.context}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={lesson.count >= 5 ? "default" : lesson.count >= 3 ? "success" : "secondary"} className="text-xs">
            Seen {lesson.count}x
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => navigator.clipboard.writeText(lesson.lesson)}
            aria-label="Copy lesson"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {categories.slice(0, 4).map(cat => {
          const Icon = getCategoryIcon(cat);
          return (
            <Badge key={cat} variant="outline" className="text-[10px] h-5 px-2 gap-1">
              <Icon className="h-2.5 w-2.5" />
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Badge>
          );
        })}
        {categories.length > 4 && (
          <Badge variant="outline" className="text-[10px] h-5 px-2 text-muted-foreground/50">
            +{categories.length - 4}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/20">
        <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {Math.round(lesson.avgConfidence * 100)}% conf
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Obj: {lesson.sourceObjectiveId.slice(0, 8)}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          Sim: {Math.round(lesson.similarityScore * 100)}%
        </span>
      </div>
    </motion.div>
  );
}

function LessonsFiltersBar({ filters, onFiltersChange }: { filters: LessonFilters; onFiltersChange: (f: Partial<LessonFilters> | ((prev: LessonFilters) => LessonFilters)) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (partial: Partial<LessonFilters> | ((prev: LessonFilters) => LessonFilters)) => {
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
          placeholder="Search lessons..."
          value={filters.search}
          onChange={(e) => handleChange({ search: e.target.value })}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filters.sortBy} onValueChange={v => handleChange({ sortBy: v as LessonFilters["sortBy"] })}>
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
            {CATEGORIES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="lessons-advanced-filters"
        >
          <Filter className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="lessons-advanced-filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2 border-t border-border/20"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Min Frequency</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={filters.minCount}
                  onChange={(e) => handleChange({ minCount: Number(e.target.value) })}
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

function CategoryStatsCard({ category, count, lessons }: { category: string; count: number; lessons: Lesson[] }) {
  if (category === "all") return null;
  
  const Icon = getCategoryIcon(category);
  const topLesson = lessons[0];
  
  return (
    <Card className="border-border/30 hover:border-border/60 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base capitalize">{category}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-foreground">{count}</span>
          <span className="text-xs text-muted-foreground">lessons</span>
        </div>
        {topLesson && (
          <p className="text-xs text-muted-foreground/70 line-clamp-2">{topLesson.lesson}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function LessonsPage() {
  const [filters, setFilters] = useState<LessonFilters>(DEFAULT_FILTERS);

  const fetchMemories = useCallback(async () => {
    const response = await apiClient.get<{ data: Memory[] }>("/memory?limit=500");
    return response.data;
  }, []);

  const { data: memories = [], isLoading, error, refetch } = useQuery({
    queryKey: ["lessons", filters],
    queryFn: fetchMemories,
    staleTime: 60_000,
  });

  // Derive lessons from memories
  const lessonMap = new Map<string, Lesson>();

  memories.forEach(memory => {
    if (!memory.content?.lessons_learned) return;
    
    memory.content.lessons_learned.forEach((l: any) => {
      if (!l.lesson) return;
      
      const key = l.lesson.toLowerCase().trim();
      if (!key) return;
      
      const categories = categorizeLesson(l.lesson);
      const confidence = memory.confidence ?? 0;
      const similarity = l.similarity_score ?? 0;
      
      const existing = lessonMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.avgConfidence = (existing.avgConfidence * (existing.count - 1) + confidence) / existing.count;
        if (similarity > existing.similarityScore) {
          existing.similarityScore = similarity;
        }
        if (new Date(memory.updated_at) > new Date(existing.lastSeen)) {
          existing.lastSeen = memory.updated_at;
        }
        // Merge categories
        existing.categories = Array.from(new Set([...existing.categories, ...categories]));
      } else {
        lessonMap.set(key, {
          lesson: l.lesson,
          context: l.context || "",
          sourceObjectiveId: memory.objective_id,
          similarityScore: similarity,
          count: 1,
          avgConfidence: confidence,
          categories,
          lastSeen: memory.updated_at,
        });
      }
    });
  });

  // Filter lessons
  let lessons = Array.from(lessonMap.values());

  if (filters.search) {
    const search = filters.search.toLowerCase();
    lessons = lessons.filter(l => 
      l.lesson.toLowerCase().includes(search) ||
      l.context.toLowerCase().includes(search)
    );
  }

  if (filters.category !== "all") {
    lessons = lessons.filter(l => l.categories.includes(filters.category));
  }

  if (filters.minCount > 0) {
    lessons = lessons.filter(l => l.count >= filters.minCount);
  }

  if (filters.minConfidence > 0) {
    lessons = lessons.filter(l => l.avgConfidence >= filters.minConfidence / 100);
  }

  // Sort lessons
  lessons.sort((a, b) => {
    switch (filters.sortBy) {
      case "frequency": return b.count - a.count;
      case "confidence": return b.avgConfidence - a.avgConfidence;
      case "recency": return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      case "relevance": return b.similarityScore - a.similarityScore;
      default: return 0;
    }
  });

  // Category stats
  const categoryCounts: Record<string, number> = {};
  lessons.forEach(l => {
    l.categories.forEach(c => {
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    });
  });

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Wrapper for filter changes
  const handleFilterChange = (partial: Partial<LessonFilters> | ((prev: LessonFilters) => LessonFilters)) => {
    if (typeof partial === "function") {
      setFilters(partial);
    } else {
      setFilters(prev => ({ ...prev, ...partial }));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Lessons Learned"
        description="Actionable lessons extracted from organizational memory, grouped by domain"
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

      {/* Category Stats Row */}
      <PremiumCard className="mb-5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Lesson Categories</h3>
            <span className="text-xs text-muted-foreground">{Object.keys(categoryCounts).length} categories</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {sortedCategories.map(([cat, count]) => (
              <CategoryStatsCard key={cat} category={cat} count={count} lessons={lessons.filter(l => l.categories.includes(cat))} />
            ))}
          </div>
        </CardContent>
      </PremiumCard>

      <PremiumCard className="flex-1 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border/30">
          <LessonsFiltersBar filters={filters} onFiltersChange={handleFilterChange} />
        </div>

        <div className="flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <EmptyState
              icon={<Lightbulb className="h-12 w-12 text-muted-foreground/30" />}
              title="Failed to load lessons"
              description={(error as Error).message}
              action={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : lessons.length === 0 ? (
            <EmptyState
              icon={<Lightbulb className="h-12 w-12 text-muted-foreground/30" />}
              title="No lessons found"
              description="Run more pipeline completions to automatically generate lessons, or adjust your filters."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lessons.map((lesson, index) => (
                <LessonCard key={lesson.lesson} lesson={lesson} rank={index + 1} />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/30 flex items-center justify-between text-sm text-muted-foreground">
          <span>{lessons.length} lessons from {memories.length} memories</span>
          <span className="text-primary font-medium">
            Top: {lessons[0]?.lesson.slice(0, 50)}...
          </span>
        </div>
      </PremiumCard>
    </div>
  );
}