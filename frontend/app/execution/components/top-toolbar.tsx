"use client";

import { useReplayStore, useViewStore } from "@/store/execution-stores";
import { useTimelineStore } from "@/store/execution-stores";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  GitBranch,
  Sliders,
} from "lucide-react";

const speeds = [0.25, 0.5, 1, 2, 5];

export function TopToolbar() {
  const { centerView, setCenterView } = useViewStore();
  const { speed, setSpeed } = useTimelineStore();
  const { isPlaying, togglePlaying, active, setActive, setPosition } = useReplayStore();

  return (
    <div className="flex items-center gap-2 border-b border-border/50 bg-card/50 px-4 py-2">
      {/* View toggle */}
      <div className="flex items-center rounded-lg border border-border/30 bg-muted/30 p-0.5">
        <button
          onClick={() => setCenterView("organization")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
            centerView === "organization" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutGrid className="h-3 w-3" />
          Org
        </button>
        <button
          onClick={() => setCenterView("dag")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
            centerView === "dag" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GitBranch className="h-3 w-3" />
          DAG
        </button>
      </div>

      <div className="mx-2 h-4 w-px bg-border/50" />

      {/* Replay controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActive(!active)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Sliders className="h-3 w-3" />
          Replay
        </button>
        {active && (
          <>
            <button onClick={() => setPosition(0)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button onClick={togglePlaying} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <SkipForward className="h-3.5 w-3.5" />
            </button>

            <div className="ml-2 flex items-center gap-1 rounded-lg border border-border/30 bg-muted/30 px-1.5 py-0.5">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-mono transition-all",
                    speed === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />
    </div>
  );
}
