"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useToastStore } from "@/lib/use-toast";
import { createObjective, runPipeline } from "@/lib/use-mutations";
import {
  Play,
  X,
  Target,
  ListChecks,
  DollarSign,
  CalendarDays,
  Cpu,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface NewRunModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewRunModal({ open, onClose }: NewRunModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [objective, setObjective] = useState("");
  const [constraints, setConstraints] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [model, setModel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "creating" | "pipelining">("idle");

  const handleSubmit = useCallback(async () => {
    if (!objective.trim() || submitting) return;

    setSubmitting(true);

    try {
      setPhase("creating");
      const toastId = addToast({
        title: "Creating objective...",
        variant: "loading",
        duration: 0,
      });

      const richInput = [
        objective.trim(),
        constraints.trim() ? `\nConstraints: ${constraints.trim()}` : "",
        budget.trim() ? `\nBudget: ${budget.trim()}` : "",
        timeline.trim() ? `\nTimeline: ${timeline.trim()}` : "",
        model.trim() ? `\nPreferred Model: ${model.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const result = await createObjective(richInput);

      useToastStore.getState().removeToast(toastId);
      addToast({
        title: "Objective Created",
        description: objective.trim().slice(0, 60),
        variant: "success",
      });

      setPhase("pipelining");
      const pipelineToastId = addToast({
        title: "Pipeline Started",
        description: "Running full compilation pipeline...",
        variant: "loading",
        duration: 0,
      });

      onClose();

      router.push(`/execution?id=${result.id}`);

      try {
        await runPipeline(result.id);

        useToastStore.getState().removeToast(pipelineToastId);
        addToast({
          title: "Pipeline Completed",
          description: "Objective compiled, planned, organized, and analyzed",
          variant: "success",
          duration: 5000,
        });

        queryClient.invalidateQueries({ queryKey: ["objectives"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["health"] });
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
        queryClient.invalidateQueries({ queryKey: ["decisions"] });
        queryClient.invalidateQueries({ queryKey: ["plans"] });
      } catch {
        useToastStore.getState().removeToast(pipelineToastId);
        addToast({
          title: "Pipeline Failed",
          description: "An error occurred during execution",
          variant: "error",
          duration: 6000,
        });

        queryClient.invalidateQueries({ queryKey: ["objectives"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    } catch {
      addToast({
        title: "Failed to Create Objective",
        description: "Check backend connection and try again",
        variant: "error",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
      setPhase("idle");
    }
  }, [
    objective,
    constraints,
    budget,
    timeline,
    model,
    submitting,
    addToast,
    onClose,
    router,
    queryClient,
  ]);

  const isCreating = phase === "creating";
  const isPipelining = phase === "pipelining";
  const loading = submitting;

  const fields = [
    {
      key: "objective",
      label: "Objective",
      placeholder: "e.g. Build a mobile-first e-commerce marketplace",
      value: objective,
      set: setObjective,
      icon: Target,
      required: true,
      textarea: true,
    },
    {
      key: "constraints",
      label: "Constraints",
      placeholder: "e.g. Must use PostgreSQL, team of 5, 3-month deadline",
      value: constraints,
      set: setConstraints,
      icon: ListChecks,
      required: false,
      textarea: true,
    },
    {
      key: "budget",
      label: "Budget",
      placeholder: "e.g. $50k initial, $10k/mo operations",
      value: budget,
      set: setBudget,
      icon: DollarSign,
      required: false,
      textarea: false,
    },
    {
      key: "timeline",
      label: "Timeline",
      placeholder: "e.g. Q3 2026, 6 months",
      value: timeline,
      set: setTimeline,
      icon: CalendarDays,
      required: false,
      textarea: false,
    },
    {
      key: "model",
      label: "Preferred Model (optional)",
      placeholder: "e.g. gpt-4o, claude-3-opus",
      value: model,
      set: setModel,
      icon: Cpu,
      required: false,
      textarea: false,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Play className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">New Run</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Define your business objective
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3.5">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <f.icon className="h-3 w-3" />
                    {f.label}
                    {f.required && (
                      <span className="text-destructive">*</span>
                    )}
                  </label>
                  {f.textarea ? (
                    <textarea
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      disabled={loading}
                      rows={f.key === "objective" ? 3 : 2}
                      className="w-full resize-none rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 transition-colors focus:border-primary/50 focus:outline-none disabled:opacity-40"
                    />
                  ) : (
                    <input
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      disabled={loading}
                      className="w-full rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 transition-colors focus:border-primary/50 focus:outline-none disabled:opacity-40"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/50 px-5 py-3.5">
              <span className="text-[10px] text-muted-foreground/60">
                {loading
                  ? isCreating
                    ? "Creating objective..."
                    : "Running full pipeline..."
                  : "The pipeline compiles, plans, organizes, and analyzes your objective"}
              </span>
              <button
                onClick={handleSubmit}
                disabled={loading || !objective.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-30"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                {loading
                  ? isCreating
                    ? "Creating..."
                    : "Running Pipeline..."
                  : "Start Run"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
