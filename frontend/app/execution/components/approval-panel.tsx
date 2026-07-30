"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { usePendingGatesQuery, useGatesQuery, useReviewGate } from "@/hooks/use-intelligence";
import {
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

export function ApprovalPanel({ objectiveId }: { objectiveId: string | null }) {
  const { data: pendingGates = [] } = usePendingGatesQuery(objectiveId);
  const { data: allGates = [] } = useGatesQuery(objectiveId);
  const reviewGate = useReviewGate();
  const [expanded, setExpanded] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  const handleReview = async (gateId: string, status: string) => {
    await reviewGate.mutateAsync({
      gate_id: gateId,
      status,
      reviewed_by: "human_reviewer",
      notes: reviewNotes || undefined,
    });
    setReviewNotes("");
  };

  if (allGates.length === 0) return null;

  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-violet-400" /> : <ChevronRight className="h-3.5 w-3.5 text-violet-400" />}
        <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-xs font-semibold text-violet-300">Approval Gates</span>
        {pendingGates.length > 0 && (
          <span className="ml-auto rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
            {pendingGates.length} pending
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
            <div className="space-y-2 border-t border-violet-500/10 px-3 py-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {allGates.map((gate) => (
                <div
                  key={gate.id}
                  className={cn(
                    "rounded-md p-2.5",
                    gate.status === "pending"
                      ? "bg-violet-500/10"
                      : gate.status === "approved"
                        ? "bg-emerald-500/10"
                        : "bg-red-500/10",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-foreground/80">{gate.title}</span>
                        {gate.status === "approved" ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                        ) : gate.status === "rejected" ? (
                          <XCircle className="h-3 w-3 shrink-0 text-red-400" />
                        ) : (
                          <RefreshCw className="h-3 w-3 shrink-0 text-violet-400" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-medium text-violet-300">
                          {gate.gate_type}
                        </span>
                        <span>by {gate.proposed_by}</span>
                      </div>
                      {gate.description && (
                        <p className="mt-1 text-[10px] leading-relaxed text-foreground/60 line-clamp-2">
                          {gate.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {gate.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="Review notes (optional)..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-border/40 bg-background/50 px-2 py-1 text-[10px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
                      />
                      <button
                        onClick={() => handleReview(gate.id, "approved")}
                        className="shrink-0 rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/30"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(gate.id, "rejected")}
                        className="shrink-0 rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-300 hover:bg-red-500/30"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {gate.review_notes && (
                    <p className="mt-1 text-[10px] italic text-muted-foreground/60">
                      "{gate.review_notes}"
                    </p>
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
