"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCommandPaletteStore } from "@/store";
import { Search, Command, ArrowRight, LayoutDashboard, PlayCircle, Building2, GitBranch, BarChart3, Radio, Scale, Gauge, Clock, Settings, History, FolderOpen, DiffIcon, LineChart, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CommandItem {
  label: string;
  href: string;
  shortcut?: string;
  category: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

const commands: CommandItem[] = [
  { label: "Dashboard", href: "/dashboard", shortcut: "⌘1", category: "Navigation", icon: LayoutDashboard },
  { label: "Live Execution", href: "/execution", shortcut: "⌘2", category: "Navigation", icon: PlayCircle },
  { label: "Organization", href: "/organization", shortcut: "⌘3", category: "Navigation", icon: Building2 },
  { label: "Execution Graph", href: "/graph", shortcut: "⌘4", category: "Navigation", icon: GitBranch },
  { label: "Operations Center", href: "/operations", shortcut: "⌘5", category: "Navigation", icon: Gauge },
  { label: "Connectors", href: "/connectors", category: "Navigation", icon: Plug },
  { label: "Execution Replay", href: "/replay", category: "Navigation", icon: History },
  { label: "Artifact Explorer", href: "/artifacts", category: "Navigation", icon: FolderOpen },
  { label: "Runtime Analytics", href: "/analytics", category: "Analytics", icon: LineChart },
  { label: "Aggregate Metrics", href: "/metrics", category: "Analytics", icon: BarChart3 },
  { label: "Execution Diff", href: "/diff", category: "Analytics", icon: DiffIcon },
  { label: "Telemetry", href: "/telemetry", category: "Analytics", icon: Radio },
  { label: "Decision Center", href: "/decisions", category: "Data", icon: Scale },
  { label: "Historical Runs", href: "/runs", category: "Data", icon: Clock },
  { label: "Settings", href: "/settings", category: "System", icon: Settings },
];

const categories = ["Navigation", "Analytics", "Data", "System"];

export function CommandPalette() {
  const { isOpen, close, toggle } = useCommandPaletteStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        router.push(filtered[selectedIndex].href);
        close();
      }
    },
    [filtered, selectedIndex, router, close]
  );

  const groupedCommands = categories
    .map((cat) => ({
      category: cat,
      items: filtered.filter((c) => c.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[12vh] backdrop-blur-md"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/40 bg-popover/95 backdrop-blur-2xl shadow-2xl shadow-black/20"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border/30 px-5 py-4">
              <Search className="h-4 w-4 text-muted-foreground/60" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, commands, and actions..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
              />
              <kbd className="flex items-center gap-1 rounded-md border border-border/30 bg-muted/50 px-1.5 py-1 font-mono text-[10px] text-muted-foreground/60">
                <Command className="h-2.5 w-2.5" />
                K
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
              {groupedCommands.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground/40">
                  <Search className="h-6 w-6" />
                  <span>No results for &ldquo;{query}&rdquo;</span>
                </div>
              ) : (
                groupedCommands.map((group) => (
                  <div key={group.category}>
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
                      {group.category}
                    </div>
                    {group.items.map((cmd, idx) => {
                      const globalIndex = filtered.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = cmd.icon;
                      return (
                        <Link
                          key={cmd.href}
                          href={cmd.href}
                          onClick={close}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-100",
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/70 hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground/50")} />
                          <span className="flex-1">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className={cn(
                              "rounded-md border border-border/30 px-1.5 py-0.5 font-mono text-[10px]",
                              isSelected ? "border-primary/20 bg-primary/5 text-primary/60" : "text-muted-foreground/40 bg-muted/30"
                            )}>
                              {cmd.shortcut}
                            </kbd>
                          )}
                          <ArrowRight className={cn(
                            "h-3 w-3 transition-opacity duration-100",
                            isSelected ? "opacity-100 text-primary" : "opacity-0"
                          )} />
                        </Link>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-4 border-t border-border/30 px-5 py-2.5 text-[10px] text-muted-foreground/40">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1 font-mono text-[9px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1 font-mono text-[9px]">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/30 bg-muted/30 px-1 font-mono text-[9px]">Esc</kbd>
                Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
