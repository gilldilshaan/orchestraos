"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
}

const MIN_PANEL = 280;
const MAX_PANEL = 500;

export function PanelLayout({
  left,
  center,
  right,
  defaultLeftWidth = 300,
  defaultRightWidth = 320,
}: PanelLayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="shrink-0 overflow-hidden border-r border-border/30 bg-card/20" style={{ width: defaultLeftWidth, minWidth: MIN_PANEL, maxWidth: MAX_PANEL }}>
        <div className="h-full overflow-y-auto scrollbar-thin">{left}</div>
      </div>
      <div className="relative flex-1 min-w-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--muted-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--muted-foreground)) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        {center}
      </div>
      <div className="shrink-0 overflow-hidden border-l border-border/30 bg-card/20" style={{ width: defaultRightWidth, minWidth: MIN_PANEL, maxWidth: MAX_PANEL }}>
        <div className="h-full overflow-y-auto scrollbar-thin">{right}</div>
      </div>
    </div>
  );
}
