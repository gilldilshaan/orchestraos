"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { type KnowledgeSearchResponse, type KnowledgeSearchHit } from "@/types";
import { PageHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { EmptyState } from "@/components/empty-state";
import { MemoryDetailModal } from "@/components/knowledge/memory-detail-modal";
import {
  Search,
  X,
  Sparkles,
  Loader2,
  Brain,
  Building2,
  Zap,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LIMIT_OPTIONS = [
  { value: "5", label: "5 results" },
  { value: "10", label: "10 results" },
  { value: "20", label: "20 results" },
  { value: "30", label: "30 results" },
];

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
        <motion.div
          className={cn(
            "h-full rounded-full",
            score >= 0.75 ? "bg-success" : score >= 0.5 ? "bg-amber-500" : "bg-destructive"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="w-10 text-right font-mono text-[11px] text-muted-foreground/60">{pct}%</span>
    </div>
  );
}

function HitCard({
  hit,
  index,
  onOpen,
}: {
  hit: KnowledgeSearchHit;
  index: number;
  onOpen: () => void;
}) {
  const memory = hit.memory;
  const content = memory.content;
  const lessonCount = content?.lessons_learned?.length ?? 0;
  const riskCount = content?.risks?.length ?? 0;
  const decisionCount = content?.decisions?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/30 bg-background/50 p-5 transition-all duration-200 hover:border-primary/25 hover:bg-background/70"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Brain className="h-3.5 w-3.5 text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground/90">
              {content?.summary || "Untitled Memory"}
            </h3>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/40">
              {memory.id.slice(0, 12)}… · objective {memory.objective_id.slice(0, 8)}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[10px]",
            hit.category === "risk" && "border-destructive/25 text-destructive",
            hit.category === "lessons" && "border-amber-500/25 text-amber-500",
            hit.category === "success" && "border-success/25 text-success"
          )}
        >
          {hit.category}
        </Badge>
      </div>

      {content?.strategy && (
        <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/60">
          {content.strategy}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/50">
        {lessonCount > 0 && <span>{lessonCount} lessons</span>}
        {riskCount > 0 && (
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> {riskCount} risks
          </span>
        )}
        {decisionCount > 0 && <span>{decisionCount} decisions</span>}
        {hit.departments.length > 0 && (
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {hit.departments.join(", ")}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/40">
          <span>Semantic similarity</span>
          <span>{Math.round((memory.confidence ?? 0) * 100)}% memory confidence</span>
        </div>
        <SimilarityBar score={hit.similarity_score} />
      </div>

      <div className="mt-4 flex justify-end border-t border-border/20 pt-3">
        <Button variant="ghost" size="sm" className="text-xs" onClick={onOpen}>
          <Layers className="h-3.5 w-3.5 mr-1.5" />
          View memory
        </Button>
      </div>
    </motion.div>
  );
}

export default function SimilarObjectivesPage() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState("10");
  const [selected, setSelected] = useState<KnowledgeSearchHit | null>(null);

  const search = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiClient.post<KnowledgeSearchResponse>("/memory/search", {
        query_text: text,
        limit: Number(limit),
        threshold: 0,
      });
      return response;
    },
  });

  const handleSearch = useCallback(() => {
    const text = query.trim();
    if (!text || search.isPending) return;
    search.mutate(text);
  }, [query, search]);

  const hits = search.data?.hits ?? [];

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        kicker="Knowledge Center"
        title="Similar Objectives"
        description="Semantic search over organizational memory to find past objectives with similar context, strategy, and risk profiles."
        actions={
          <Button variant="outline" size="sm" onClick={() => search.reset()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        }
      />

      <PremiumCard className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b border-border/30 p-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                placeholder="Describe the objective you are starting… e.g. build a fraud detection pipeline"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 pr-10"
                aria-label="Search similar objectives"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setQuery("")}
                  aria-label="Clear query"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-auto min-w-[120px]">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={!query.trim() || search.isPending}>
              {search.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/40">
            Queries are embedded server-side and ranked by cosine similarity against stored memories.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {search.isPending ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground/50">Embedding query and scanning memory…</p>
            </div>
          ) : search.isError ? (
            <EmptyState
              icon={<Search className="h-12 w-12 text-muted-foreground/30" />}
              title="Search failed"
              description={(search.error as Error).message}
              action={<Button onClick={handleSearch} variant="outline">Retry</Button>}
            />
          ) : search.data && hits.length === 0 ? (
            <EmptyState
              icon={<Brain className="h-12 w-12 text-muted-foreground/30" />}
              title="No similar objectives found"
              description="No memories matched this query above the similarity threshold. Try different wording or start with a broader description."
            />
          ) : hits.length > 0 ? (
            <div className="space-y-4">
              <p className="text-[11px] text-muted-foreground/50">
                {hits.length} result{hits.length === 1 ? "" : "s"} for “{search.data?.query}”
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {hits.map((hit, i) => (
                    <HitCard
                      key={hit.memory.id}
                      hit={hit}
                      index={i}
                      onOpen={() => setSelected(hit)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="h-12 w-12 text-muted-foreground/30" />}
              title="Describe your next objective"
              description="Similar-objective search compares intent, constraints, and risk language against every memory in the organization."
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/30 p-4 text-xs text-muted-foreground">
          <span>
            {hits.length} similar {hits.length === 1 ? "objective" : "objectives"} ranked by similarity
          </span>
          {search.data && (
            <span className="text-muted-foreground/40">threshold 0.0 · {search.data.query.length} chars</span>
          )}
        </div>
      </PremiumCard>

      <MemoryDetailModal
        memory={selected?.memory ?? null}
        similarityScore={selected?.similarity_score}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
