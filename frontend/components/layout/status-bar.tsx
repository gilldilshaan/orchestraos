"use client";

import { useExecutionStore, useSidebarStore } from "@/store";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const status = useExecutionStore((s) => s.status);
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const events = useExecutionStore((s) => s.events);

  const statusIndicator = () => {
    switch (status) {
      case "running":
        return (
          <motion.span
            className="flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            Running
          </motion.span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Ready
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            Idle
          </span>
        );
    }
  };

  return (
    <footer
      className={cn(
        "fixed bottom-0 right-0 z-20 flex h-statusbar items-center border-t border-border/50 bg-background/90 backdrop-blur-md px-4 text-[11px] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isCollapsed ? "left-sidebar-collapsed" : "left-sidebar"
      )}
    >
      <div className="flex flex-1 items-center gap-4">
        {statusIndicator()}
        <span className="hidden sm:inline text-muted-foreground/60">v0.1.0</span>
        <span className="hidden md:inline text-muted-foreground/40">·</span>
        <span className="hidden md:inline text-muted-foreground/60">
          {events.length} events
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-success" />
          <span className="hidden sm:inline">API</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-success" />
          <span className="hidden md:inline">Redis</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-success" />
          <span className="hidden lg:inline">PostgreSQL</span>
        </span>
      </div>
    </footer>
  );
}
