"use client";

import { useCommandPaletteStore, useExecutionStore, useSidebarStore } from "@/store";
import { Search, Command, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useSSEStore } from "@/store/sse-store";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/execution": "Live Execution",
  "/operations": "Operations Center",
  "/organization": "Organization",
  "/graph": "Execution Graph",
  "/replay": "Execution Replay",
  "/connectors": "Connectors",
  "/artifacts": "Artifact Explorer",
  "/reports": "Reports",
  "/risks": "Risk Register",
  "/analytics": "Runtime Analytics",
  "/metrics": "Aggregate Metrics",
  "/diff": "Execution Diff",
  "/telemetry": "Telemetry",
  "/decisions": "Decision Center",
  "/runs": "Historical Runs",
  "/benchmarks": "Benchmarks",
  "/settings": "Settings",
  "/objective": "Objective",
  "/plan": "Plan",
};

export function TopBar() {
  const openCommandPalette = useCommandPaletteStore((s) => s.open);
  const executionStatus = useExecutionStore((s) => s.status);
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const sseConnected = useSSEStore((s) => s.connected);
  const pathname = usePathname();

  const isActive = executionStatus === "running" || sseConnected;
  const pageTitle = pageTitles[pathname] ?? null;

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-20 flex h-topbar items-center border-b border-border/30 bg-background/70 backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isCollapsed ? "left-sidebar-collapsed" : "left-sidebar"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
        {pageTitle && (
          <div className="hidden min-w-0 items-center gap-1.5 lg:flex">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/30">
              OrchestraOS
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/20" />
            <span className="truncate text-[11px] font-medium text-foreground/60">{pageTitle}</span>
          </div>
        )}
        <button
          onClick={openCommandPalette}
          className="group flex flex-1 items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-1.5 text-sm text-muted-foreground/60 transition-all duration-200 hover:border-border/60 hover:bg-muted/30 hover:text-foreground/60 focus-ring md:max-w-sm"
        >
          <Search className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
          <span className="flex-1 text-left text-xs">Search commands and pages...</span>
          <kbd className="kbd hidden md:inline-flex">
            <Command className="h-2.5 w-2.5" />
            K
          </kbd>
        </button>
      </div>
      <div className="flex items-center gap-2 pr-4">
        {isActive && (
          <motion.div
            className="flex items-center gap-1.5 rounded-md bg-primary/8 px-2.5 py-1"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[11px] font-medium text-primary/80">
              {executionStatus === "running" ? "Executing" : "Live"}
            </span>
          </motion.div>
        )}
      </div>
    </header>
  );
}
