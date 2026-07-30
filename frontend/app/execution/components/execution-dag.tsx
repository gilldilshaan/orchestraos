"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
import { animate as animeAnimate } from "animejs";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useSSEStore } from "@/store/sse-store";
import { CheckCircle2, Loader2, XCircle, Circle, ArrowRight } from "lucide-react";
import type { ApiStoredEvent } from "@/hooks/use-api";

interface ExecutionDAGProps {
  persistedEvents?: ApiStoredEvent[];
}

const stageColors: Record<string, { node: string; border: string; bg: string; icon: typeof Circle; text: string }> = {
  completed: { node: "border-emerald-500/30 bg-emerald-500/[0.05]", border: "border-emerald-500/30", bg: "bg-emerald-500/[0.05]", icon: CheckCircle2, text: "text-emerald-400/80" },
  running:   { node: "border-blue-500/40 bg-blue-500/[0.06]",       border: "border-blue-500/40",    bg: "bg-blue-500/[0.06]",    icon: Loader2,       text: "text-blue-400/80" },
  started:   { node: "border-blue-500/40 bg-blue-500/[0.06]",       border: "border-blue-500/40",    bg: "bg-blue-500/[0.06]",    icon: Loader2,       text: "text-blue-400/80" },
  failed:    { node: "border-red-500/30 bg-red-500/[0.05]",         border: "border-red-500/30",      bg: "bg-red-500/[0.05]",     icon: XCircle,       text: "text-red-400/80" },
  error:     { node: "border-red-500/30 bg-red-500/[0.05]",         border: "border-red-500/30",      bg: "bg-red-500/[0.05]",     icon: XCircle,       text: "text-red-400/80" },
  pending:   { node: "border-border/20 bg-muted/10",                border: "border-border/20",       bg: "bg-muted/10",            icon: Circle,        text: "text-muted-foreground/30" },
};

const PIPELINE_STAGES = [
  "compiler", "readiness", "planner", "organization",
  "risk", "decision", "devils_advocate",
  "success_probability", "resource_gap", "dependency_graph",
  "bottleneck", "dashboard", "scenario",
];

const PIPELINE_LABELS: Record<string, string> = {
  compiler: "Compile",
  readiness: "Readiness",
  planner: "Plan",
  organization: "Organize",
  risk: "Risk",
  decision: "Decision",
  devils_advocate: "Devil's Advocate",
  success_probability: "Success Prob.",
  resource_gap: "Resource Gap",
  dependency_graph: "Dependency Graph",
  bottleneck: "Bottleneck",
  dashboard: "Dashboard",
  scenario: "Scenario",
};

const LAYOUT_COLS = 3;

function PipelineNode({ data }: NodeProps) {
  const d = data as unknown as { label: string; status: string };
  const cfg = stageColors[d.status] ?? stageColors.pending;
  const Icon = cfg.icon;
  const isRunning = d.status === "running" || d.status === "started";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-all min-w-[120px] group",
        cfg.node,
        isRunning && "shadow-[0_0_14px_rgba(59,130,246,0.08)]",
      )}
    >
      <Handle type="target" position={Position.Top} className="!border-border/30 !bg-muted-foreground/20 !w-2 !h-2" />
      <div className={cn("flex h-5 w-5 items-center justify-center", cfg.text)}>
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0">
        <div className={cn("text-[11px] font-medium leading-tight", cfg.text)}>{d.label}</div>
        <div className="text-[9px] text-muted-foreground/30 capitalize">{d.status}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!border-border/30 !bg-muted-foreground/20 !w-2 !h-2" />
    </motion.div>
  );
}

const nodeTypes = { pipelineNode: PipelineNode };

function DAGFlow({ persistedEvents }: ExecutionDAGProps) {
  const sseEvents = useSSEStore((s) => s.events);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCompletedRef = useRef(0);
  const { fitView } = useReactFlow();

  const stageStatus = useMemo(() => {
    const map: Record<string, string> = {};

    if (persistedEvents) {
      for (const ev of persistedEvents) {
        if (ev.stage && ev.stage !== "pipeline") {
          if (ev.status === "completed" || ev.status === "error") {
            map[ev.stage] = ev.status;
          } else if (!map[ev.stage]) {
            map[ev.stage] = ev.status;
          }
        }
      }
    }

    for (const ev of sseEvents) {
      if (ev.stage && ev.stage !== "pipeline") {
        if (ev.status === "completed" || ev.status === "error") {
          map[ev.stage] = ev.status;
        } else if (map[ev.stage] !== "completed" && map[ev.stage] !== "error") {
          map[ev.stage] = ev.status;
        }
      }
    }
    return map;
  }, [sseEvents, persistedEvents]);

  // Animate sequential completion through the DAG using anime.js
  const completedCount = Object.values(stageStatus).filter((s) => s === "completed").length;
  useEffect(() => {
    if (completedCount > prevCompletedRef.current && containerRef.current) {
      const nodes = containerRef.current.querySelectorAll(".react-flow__node");
      const completedNodes = Array.from(nodes).slice(0, completedCount);
      if (completedNodes.length > 0) {
        // Pulse animation for newly completed node
        const node = completedNodes[completedNodes.length - 1] as HTMLElement;
        animeAnimate(node, {
          scale: [1, 1.05, 1],
          duration: 600,
          easing: "easeOutQuad",
        });

        // Data flow animation through edges
        const edges = containerRef.current.querySelectorAll(".react-flow__edge");
        if (completedNodes.length > 1 && completedNodes.length <= edges.length) {
          const edge = edges[completedNodes.length - 2] as HTMLElement;
          animeAnimate(edge, {
            opacity: [0.3, 1],
            duration: 400,
            easing: "easeOutQuad",
          });
        }
      }
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount]);

  // Fit view on mount with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.5, duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [fitView]);

  const dagNodes: Node[] = useMemo(() => {
    return PIPELINE_STAGES.map((name, i) => {
      const col = i % LAYOUT_COLS;
      const row = Math.floor(i / LAYOUT_COLS);
      return {
        id: name,
        type: "pipelineNode",
        position: { x: col * 160, y: row * 80 },
        data: { label: PIPELINE_LABELS[name] ?? name, status: stageStatus[name] ?? "pending" },
      };
    });
  }, [stageStatus]);

  const dagEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < PIPELINE_STAGES.length - 1; i++) {
      const src = PIPELINE_STAGES[i];
      const tgt = PIPELINE_STAGES[i + 1];
      const srcStatus = stageStatus[src] ?? "pending";
      const tgtStatus = stageStatus[tgt] ?? "pending";
      const isActive = srcStatus === "completed" && (tgtStatus === "running" || tgtStatus === "started" || tgtStatus === "pending");
      const isCompleted = srcStatus === "completed" && tgtStatus === "completed";
      edges.push({
        id: `e-${src}-${tgt}`,
        source: src,
        target: tgt,
        type: "smoothstep",
        animated: !isCompleted && isActive,
        style: {
          stroke: isCompleted
            ? "hsl(var(--primary) / 0.4)"
            : srcStatus === "completed"
              ? "hsl(var(--primary) / 0.2)"
              : "hsl(var(--muted-foreground) / 0.1)",
          strokeWidth: isCompleted ? 2 : srcStatus === "completed" ? 1.5 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCompleted
            ? "hsl(var(--primary) / 0.4)"
            : srcStatus === "completed"
              ? "hsl(var(--primary) / 0.2)"
              : "hsl(var(--muted-foreground) / 0.15)",
        },
      });
    }
    return edges;
  }, [stageStatus]);

  return (
    <div className="h-full w-full" ref={containerRef}>
      <ReactFlow
        nodes={dagNodes}
        edges={dagEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        minZoom={0.3}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted-foreground) / 0.03)" gap={24} size={1} />
        <Controls className="!border-border/30 !bg-card/60 !text-muted-foreground/60 [&>button]:!border-border/20 [&>button]:!bg-muted/20 [&>button]:!text-muted-foreground/60 hover:[&>button]:!bg-muted/40" />
        <MiniMap
          nodeColor="hsl(var(--primary) / 0.4)"
          maskColor="hsl(var(--muted-foreground) / 0.05)"
          className="!border-border/20 !rounded-lg"
          style={{ width: 100, height: 60 }}
        />
      </ReactFlow>
    </div>
  );
}

export function ExecutionDAG(props: ExecutionDAGProps) {
  return (
    <ReactFlowProvider>
      <DAGFlow {...props} />
    </ReactFlowProvider>
  );
}
