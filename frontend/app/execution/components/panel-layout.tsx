"use client";

import { ReactNode, useState, useCallback, useRef, useEffect } from "react";
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
  defaultLeftWidth = 320,
  defaultRightWidth = 320,
}: PanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left Panel */}
      <div style={{ width: leftWidth, minWidth: MIN_PANEL }} className="shrink-0 overflow-hidden border-r border-border/50 bg-card/30">
        <div className="h-full overflow-y-auto scrollbar-thin">{left}</div>
      </div>

      {/* Center Panel */}
      <div className="flex-1 min-w-0 overflow-hidden bg-background">
        {center}
      </div>

      {/* Right Panel */}
      <div style={{ width: rightWidth, minWidth: MIN_PANEL }} className="shrink-0 overflow-hidden border-l border-border/50 bg-card/30">
        <div className="h-full overflow-y-auto scrollbar-thin">{right}</div>
      </div>
    </div>
  );
}
