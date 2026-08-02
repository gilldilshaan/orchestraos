"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useSidebarStore, useNewRunModalStore } from "@/store";
import {
  LayoutDashboard,
  PlayCircle,
  Building2,
  GitBranch,
  BarChart3,
  Radio,
  Scale,
  Gauge,
  Clock,
  Settings,
  ChevronLeft,
  Orbit,
  History,
  FolderOpen,
  DiffIcon,
  LineChart,
  Plug,
  Zap,
  FileText,
  ShieldAlert,
} from "lucide-react";

const navGroups = [
  {
    label: "Monitor",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/execution", label: "Live Execution", icon: PlayCircle },
      { href: "/operations", label: "Operations Center", icon: Gauge },
    ],
  },
  {
    label: "Explore",
    items: [
      { href: "/organization", label: "Organization", icon: Building2 },
      { href: "/graph", label: "Execution Graph", icon: GitBranch },
      { href: "/replay", label: "Execution Replay", icon: History },
      { href: "/connectors", label: "Connectors", icon: Plug },
      { href: "/artifacts", label: "Artifact Explorer", icon: FolderOpen },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/risks", label: "Risk Register", icon: ShieldAlert },
      { href: "/analytics", label: "Runtime Analytics", icon: LineChart },
      { href: "/metrics", label: "Aggregate Metrics", icon: BarChart3 },
      { href: "/diff", label: "Execution Diff", icon: DiffIcon },
      { href: "/telemetry", label: "Telemetry", icon: Radio },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/decisions", label: "Decision Center", icon: Scale },
      { href: "/runs", label: "Historical Runs", icon: Clock },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, collapse } = useSidebarStore();
  const openNewRun = useNewRunModalStore((s) => s.open);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-full flex-col border-r border-border/30 bg-background/85 backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isCollapsed ? "w-sidebar-collapsed" : "w-sidebar"
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex h-12 shrink-0 items-center border-b border-border/30 px-4",
          isCollapsed && "justify-center px-0"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <motion.div
            className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 shadow-glow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Orbit className="h-4 w-4 text-primary" />
            <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-primary/20" />
          </motion.div>
          {!isCollapsed && (
            <motion.span
              className="text-sm font-semibold tracking-tight text-foreground/95"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Orchestra
              <span className="text-primary">OS</span>
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-2 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && (
              <div className="flex items-center gap-2 px-3 pb-1.5 pt-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/30">
                  {group.label}
                </span>
                <span className="h-px flex-1 bg-border/20" />
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 focus-ring",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground/60 hover:bg-muted/20 hover:text-foreground/80",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    {isActive && (
                      <>
                        <motion.div
                          layoutId="nav-active-bg"
                          className="absolute inset-0 rounded-lg border border-primary/15"
                          style={{ backgroundColor: "hsl(var(--primary) / 0.08)" }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        <motion.div
                          layoutId="nav-active-indicator"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-glow"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      </>
                    )}
                    <motion.div
                      className={cn(
                        "relative flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-150",
                        isActive && "bg-primary/12"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground/50")} />
                    </motion.div>
                    {!isCollapsed && (
                      <span className="relative text-xs">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-border/30 p-2">
        {/* Quick action button */}
        {!isCollapsed && (
          <motion.button
            onClick={openNewRun}
            className="mb-2 flex w-full items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary ring-1 ring-inset ring-primary/15 transition-all hover:bg-primary/15 hover:shadow-glow"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>New Objective</span>
            <span className="ml-auto font-mono text-[9px] text-primary/50">N</span>
          </motion.button>
        )}
        {isCollapsed && (
          <motion.button
            onClick={openNewRun}
            aria-label="New Objective"
            className="mb-2 flex w-full items-center justify-center rounded-lg bg-primary/10 px-0 py-2 text-primary ring-1 ring-inset ring-primary/15 transition-all hover:bg-primary/15"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap className="h-3.5 w-3.5" />
          </motion.button>
        )}
        {/* Collapse toggle */}
        <motion.button
          onClick={collapse}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground/50 transition-colors hover:bg-muted/20 hover:text-muted-foreground"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ChevronLeft
            className={cn("h-3.5 w-3.5 transition-transform duration-300", isCollapsed && "rotate-180")}
          />
          {!isCollapsed && <span>Collapse</span>}
        </motion.button>
      </div>
    </aside>
  );
}
