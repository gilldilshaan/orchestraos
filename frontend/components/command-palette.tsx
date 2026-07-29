"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCommandPaletteStore } from "@/store";
import { Search, Command, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const commands = [
  { label: "Dashboard", href: "/dashboard", shortcut: "⌘1" },
  { label: "Live Execution", href: "/execution", shortcut: "⌘2" },
  { label: "Organization", href: "/organization", shortcut: "⌘3" },
  { label: "Execution Graph", href: "/graph", shortcut: "⌘4" },
  { label: "Runtime Metrics", href: "/metrics", shortcut: "⌘5" },
  { label: "Telemetry", href: "/telemetry", shortcut: "⌘6" },
  { label: "Reports", href: "/reports", shortcut: "⌘7" },
  { label: "Decision Center", href: "/decisions", shortcut: "⌘8" },
  { label: "Benchmarks", href: "/benchmarks", shortcut: "⌘9" },
  { label: "Historical Runs", href: "/runs", shortcut: "⌘0" },
  { label: "Settings", href: "/settings" },
];

export function CommandPalette() {
  const { isOpen, close, toggle } = useCommandPaletteStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close, toggle]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border/50 bg-popover shadow-2xl"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search pages and commands..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="flex items-center gap-1 rounded border border-border/50 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                <Command className="h-2.5 w-2.5" />
                K
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 scrollbar-thin">
              {commands.map((cmd) => (
                <Link
                  key={cmd.href}
                  href={cmd.href}
                  onClick={close}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    "text-foreground/80 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1">{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="rounded border border-border/50 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
