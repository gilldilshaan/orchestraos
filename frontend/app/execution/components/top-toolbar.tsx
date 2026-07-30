"use client";

import { motion } from "motion/react";
import { useReplayStore, useViewStore } from "@/store/execution-stores";
import { useTimelineStore } from "@/store/execution-stores";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sliders,
  LayoutGrid,
  GitBranch,
} from "lucide-react";

const speeds = [0.25, 0.5, 1, 2, 5];

const viewOptions = [
  { key: "organization" as const, label: "Org", icon: LayoutGrid },
  { key: "dag" as const, label: "DAG", icon: GitBranch },
];

export function TopToolbar() {
  const { centerView, setCenterView } = useViewStore();
  const { speed, setSpeed } = useTimelineStore();
  const { isPlaying, togglePlaying, active, setActive, setPosition } = useReplayStore();

  return (
    <div className="flex items-center gap-2 border-b border-border/20 bg-muted/[0.02] px-3 py-1.5">
      {/* View toggle */}
      <motion.div
        className="flex items-center rounded-md border border-border/20 bg-muted/20 p-0.5"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        {viewOptions.map((v) => (
          <motion.button
            key={v.key}
            onClick={() => setCenterView(v.key)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] font-medium transition-colors",
              centerView === v.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground"
            )}
          >
            <v.icon className="h-3 w-3" />
            {v.label}
          </motion.button>
        ))}
      </motion.div>

      <div className="h-3 w-px bg-border/20" />

      {/* Replay */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setActive(!active)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20"
          )}
        >
          <Sliders className="h-3 w-3" />
          Replay
        </button>
        {active && (
          <>
            <motion.button
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setPosition(0)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="rounded p-1 text-muted-foreground/50 hover:bg-muted/20 hover:text-foreground"
            >
              <SkipBack className="h-3 w-3" />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={togglePlaying}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="rounded p-1 text-muted-foreground/50 hover:bg-muted/20 hover:text-foreground"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </motion.button>
            <motion.button
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="rounded p-1 text-muted-foreground/50 hover:bg-muted/20 hover:text-foreground"
            >
              <SkipForward className="h-3 w-3" />
            </motion.button>
            <motion.div
              className="ml-1 flex items-center gap-0.5 rounded-md border border-border/20 bg-muted/20 px-1 py-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
            >
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-mono transition-all",
                    speed === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground/50 hover:text-foreground"
                  )}
                >
                  {s}×
                </button>
              ))}
            </motion.div>
          </>
        )}
      </div>

      <div className="flex-1" />
    </div>
  );
}
