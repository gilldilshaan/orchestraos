"use client";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { StatusBar } from "./status-bar";
import { CommandPalette } from "@/components/command-palette";
import { NewRunModal } from "@/components/new-run-modal";
import { PageTransition } from "@/components/premium/page-transition";
import { MissionControlBackground } from "@/components/3d/scene-wrapper";
import { cn } from "@/lib/utils";
import { useSidebarStore, useNewRunModalStore } from "@/store";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const newRunOpen = useNewRunModalStore((s) => s.isOpen);
  const closeNewRun = useNewRunModalStore((s) => s.close);

  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/20">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-xs focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      {/* Mission Control Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <MissionControlBackground className="h-full w-full" intensity={0.3} />
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-grid-subtle opacity-[0.12]" />

      {/* Noise texture */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-noise" />

      <Sidebar />
      <TopBar />
      <main
        id="main-content"
        className={cn(
          "relative z-10 min-h-screen transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isCollapsed ? "ml-sidebar-collapsed" : "ml-sidebar"
        )}
        style={{ paddingTop: "var(--topbar-height)", paddingBottom: "var(--statusbar-height)" }}
      >
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <StatusBar />
      <CommandPalette />
      <NewRunModal open={newRunOpen} onClose={closeNewRun} />
    </div>
  );
}
