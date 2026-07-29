"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { useToastStore } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

const iconMap = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  loading: Loader2,
};

const colorMap = {
  default: "border-border/50 text-foreground",
  success: "border-success/30 text-success",
  error: "border-destructive/30 text-destructive",
  loading: "border-primary/30 text-primary",
};

const bgMap = {
  default: "bg-card",
  success: "bg-success/5",
  error: "bg-destructive/5",
  loading: "bg-primary/5",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ReturnType<typeof useToastStore.getState>["toasts"][number];
  onDismiss: () => void;
}) {
  const Icon = iconMap[toast.variant];
  const isSpinning = toast.variant === "loading";

  useEffect(() => {
    if (toast.variant === "loading") return;
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, toast.variant, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md",
        bgMap[toast.variant],
        colorMap[toast.variant],
      )}
    >
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", isSpinning && "animate-spin")}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
