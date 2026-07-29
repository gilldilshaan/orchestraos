"use client";

import { useCommandPaletteStore, useExecutionStore, useSidebarStore } from "@/store";
import { Search, Bell, Terminal, Radio } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function TopBar() {
  const openCommandPalette = useCommandPaletteStore((s) => s.open);
  const executionStatus = useExecutionStore((s) => s.status);
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);

  const isActive = executionStatus === "running";

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-20 flex h-topbar items-center border-b border-border/50 bg-background/80 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isCollapsed ? "left-sidebar-collapsed" : "left-sidebar"
      )}
    >
      <div className="flex flex-1 items-center gap-3 px-4">
        <button
          onClick={openCommandPalette}
          className="group flex flex-1 items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:border-border/80 hover:bg-muted/50 hover:text-foreground/80 focus:outline-none focus:ring-1 focus:ring-primary/30 md:max-w-md"
        >
          <Search className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-105" />
          <span className="flex-1 text-left">Search commands...</span>
          <kbd className="hidden rounded border border-border/50 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>
      <div className="flex items-center gap-1 pr-4">
        {isActive && (
          <motion.div
            className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[11px] font-medium text-primary">Executing</span>
          </motion.div>
        )}
        <button className="relative rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground">
          <Terminal className="h-4 w-4" />
        </button>
        <button className="group relative rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground">
          <Bell className="h-4 w-4 transition-transform group-hover:scale-105" />
          <motion.span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"
            animate={isActive ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </button>
      </div>
    </header>
  );
}
