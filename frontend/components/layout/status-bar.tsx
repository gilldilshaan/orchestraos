"use client";

import { useSidebarStore } from "@/store";
import { useSystemHealthQuery } from "@/hooks/use-api";
import { useSSEStore } from "@/store/sse-store";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { PulseRing } from "@/components/premium/page-transition";

export function StatusBar() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const sseEvents = useSSEStore((s) => s.events);
  const sseConnected = useSSEStore((s) => s.connected);
  const { data: system } = useSystemHealthQuery();

  const deps = system?.dependencies ?? {};

  const backendOk = system?.status === "healthy";
  const connected = sseConnected || backendOk;

  const dbOk = deps.database?.status === "ok";
  const redisOk = deps.redis?.status === "ok";

  const services = [
    { label: "API", ok: dbOk },
    { label: "Redis", ok: redisOk },
    { label: "PG", ok: dbOk },
  ];

  return (
    <footer
      className={cn(
        "fixed bottom-0 right-0 z-20 flex h-statusbar items-center border-t border-border/30 bg-background/70 backdrop-blur-2xl px-4 text-[11px] text-muted-foreground/50 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isCollapsed ? "left-sidebar-collapsed" : "left-sidebar"
      )}
    >
      <div className="flex flex-1 items-center gap-4">
        <span className="flex items-center gap-1.5">
          <PulseRing
            active={connected}
            color={connected ? "hsl(var(--success))" : "hsl(var(--muted-foreground))"}
            size={8}
          />
          <span className={connected ? "text-muted-foreground/70" : ""}>
            {sseConnected ? "Live" : backendOk ? "Connected" : "Disconnected"}
          </span>
        </span>
        <span className="text-muted-foreground/30 hidden sm:inline">{system?.version ?? "0.1.0"}</span>
        <span className="text-muted-foreground/20 hidden md:inline">·</span>
        <span className="text-muted-foreground/40 hidden md:inline">
          {sseEvents.length} events
        </span>
      </div>
      <div className="flex items-center gap-3">
        {services.map((svc) => (
          <span key={svc.label} className="flex items-center gap-1.5">
            <span className={cn("h-1 w-1 rounded-full", svc.ok ? "bg-success/60" : "bg-destructive/60")} />
            <span className="hidden sm:inline text-muted-foreground/40">{svc.label}</span>
          </span>
        ))}
      </div>
    </footer>
  );
}
