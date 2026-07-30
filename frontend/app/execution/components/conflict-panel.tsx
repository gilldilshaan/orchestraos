"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  useConflictsQuery,
  useResolveConflict,
} from "@/hooks/use-intelligence";
import {
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";

export function ConflictPanel({ objectiveId }: { objectiveId: string | null }) {
  const { data: conflicts = [] } = useConflictsQuery(objectiveId);
  const resolveConflict = useResolveConflict();
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const openConflicts = conflicts.filter((c) => c.status === "open");

  const handleResolve = async (conflictId: string) => {
    if (!resolutionText.trim()) return;
    setResolving(conflictId);
    try {
      await resolveConflict.mutateAsync({
        conflict_id: conflictId,
        resolution: resolutionText,
        resolved_by: "human_reviewer",
      });
      setResolutionText("");
    } finally {
      setResolving(null);
    }
  };

  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-amber-400" /> : <ChevronRight className="h-3.5 w-3.5 text-amber-400" />}
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-semibold text-amber-300">Agent Conflicts</span>
        {openConflicts.length > 0 && (
          <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            {openConflicts.length} open
          </span>
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-amber-500/10 px-3 py-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className={cn(
                    "rounded-md p-2.5",
                    conflict.status === "open"
                      ? "bg-amber-500/10"
                      : "bg-emerald-500/10",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-foreground/80">{conflict.subject}</span>
                        {conflict.status === "resolved" ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3 w-3 shrink-0 text-amber-400" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{conflict.agent_a}</span>
                        <span className="text-amber-400/60">vs</span>
                        <span>{conflict.agent_b}</span>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-foreground/60 line-clamp-3">
                        {conflict.disagreement}
                      </p>
                    </div>
                  </div>

                  {conflict.status === "open" && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="Type resolution..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-border/40 bg-background/50 px-2 py-1 text-[10px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleResolve(conflict.id);
                        }}
                      />
                      <button
                        onClick={() => handleResolve(conflict.id)}
                        disabled={!resolutionText.trim() || resolving === conflict.id}
                        className="shrink-0 rounded-md bg-amber-500/20 px-2 py-1 text-[10px] font-medium text-amber-300 hover:bg-amber-500/30 disabled:opacity-40"
                      >
                        {resolving === conflict.id ? "..." : "Resolve"}
                      </button>
                    </div>
                  )}

                  {conflict.resolution && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1">
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                      <p className="text-[10px] leading-relaxed text-emerald-300/80">{conflict.resolution}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
