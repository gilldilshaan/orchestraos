"use client";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { StatusBar } from "./status-bar";
import { CommandPalette } from "@/components/command-palette";
import { PageTransition } from "@/components/premium/page-transition";
import { MissionControlBackground } from "@/components/3d/scene-wrapper";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Mission Control Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <MissionControlBackground className="h-full w-full" intensity={0.4} />
      </div>

      {/* Subtle grid overlay */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-grid-subtle opacity-[0.15]" />

      <Sidebar />
      <TopBar />
      <main
        className={cn(
          "relative z-10 min-h-screen transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isCollapsed ? "ml-sidebar-collapsed" : "ml-sidebar"
        )}
        style={{ paddingTop: "var(--topbar-height)", paddingBottom: "var(--statusbar-height)" }}
      >
        <div className="p-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <StatusBar />
      <CommandPalette />
    </div>
  );
}
