"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store";
import {
  LayoutDashboard,
  PlayCircle,
  Building2,
  GitBranch,
  BarChart3,
  Radio,
  FileText,
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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/execution", label: "Live Execution", icon: PlayCircle },
  { href: "/operations", label: "Operations Center", icon: Gauge },
  { href: "/connectors", label: "Connectors", icon: Plug },
  { href: "/replay", label: "Execution Replay", icon: History },
  { href: "/organization", label: "Organization", icon: Building2 },
  { href: "/graph", label: "Execution Graph", icon: GitBranch },
  { href: "/artifacts", label: "Artifact Explorer", icon: FolderOpen },
  { href: "/analytics", label: "Runtime Analytics", icon: LineChart },
  { href: "/metrics", label: "Aggregate Metrics", icon: BarChart3 },
  { href: "/diff", label: "Execution Diff", icon: DiffIcon },
  { href: "/telemetry", label: "Telemetry", icon: Radio },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/decisions", label: "Decision Center", icon: Scale },
  { href: "/benchmarks", label: "Benchmarks", icon: Gauge },
  { href: "/runs", label: "Historical Runs", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, isCollapsed, toggle, collapse } = useSidebarStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-full flex-col border-r border-border/50 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isCollapsed ? "w-sidebar-collapsed" : "w-sidebar"
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex h-12 items-center border-b border-border/50 px-4",
          isCollapsed && "justify-center px-0"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <motion.div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Orbit className="h-4 w-4 text-primary" />
          </motion.div>
          {!isCollapsed && (
            <motion.span
              className="text-sm font-semibold tracking-tight"
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
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {isActive && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </motion.div>
              {!isCollapsed && (
                <motion.span
                  className="relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {item.label}
                </motion.span>
              )}
              {!isActive && !isCollapsed && (
                <span
                  className="absolute bottom-1 left-3 right-3 h-px scale-x-0 rounded-full bg-primary/20 transition-transform duration-200 group-hover:scale-x-100"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border/50 p-2">
        <motion.button
          onClick={collapse}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
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
