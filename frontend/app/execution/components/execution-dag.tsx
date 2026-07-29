"use client";

import { useMemo } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useSSEStore } from "@/store/sse-store";
import { CheckCircle2, Loader2, XCircle, Circle } from "lucide-react";

const stageColors: Record<string, { node: string; border: string; bg: string; icon: typeof Circle; text: string }> = {
  completed: { node: "border-emerald-500/40 bg-emerald-500/[0.06]", border: "border-emerald-500/40", bg: "bg-emerald-500/[0.06]", icon: CheckCircle2, text: "text-emerald-400" },
  running:   { node: "border-blue-500/50 bg-blue-500/[0.08]",       border: "border-blue-500/50",    bg: "bg-blue-500/[0.08]",    icon: Loader2,       text: "text-blue-400" },
  started:   { node: "border-blue-500/50 bg-blue-500/[0.08]",       border: "border-blue-500/50",    bg: "bg-blue-500/[0.08]",    icon: Loader2,       text: "text-blue-400" },
  failed:    { node: "border-red-500/40 bg-red-500/[0.06]",         border: "border-red-500/40",      bg: "bg-red-500/[0.06]",     icon: XCircle,       text: "text-red-400" },
  error:     { node: "border-red-500/40 bg-red-500/[0.06]",         border: "border-red-500/40",      bg: "bg-red-500/[0.06]",     icon: XCircle,       text: "text-red-400" },
  pending:   { node: "border-border/30 bg-muted/15",                border: "border-border/30",       bg: "bg-muted/15",            icon: Circle,        text: "text-muted-foreground/50" },
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
      transition={{ duration: 0.25 }}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-all min-w-[120px]",
        cfg.node,
        isRunning && "shadow-[0_0_14px_rgba(59,130,246,0.12)]",
      )}
    >
      <Handle type="target" position={Position.Top} className="!border-border !bg-muted-foreground/30" />
      <div className={cn("flex h-5 w-5 items-center justify-center", cfg.text)}>
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0">
        <div className={cn("text-[11px] font-medium leading-tight", cfg.text)}>{d.label}</div>
        <div className="text-[9px] text-muted-foreground/50 capitalize">{d.status}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!border-border !bg-muted-foreground/30" />
    </motion.div>
  );
}

const nodeTypes = { pipelineNode: PipelineNode };

export function ExecutionDAG() {
  const sseEvents = useSSEStore((s) => s.events);

  const stageStatus = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of sseEvents) {
      if (ev.stage && ev.stage !== "pipeline") {
        if (ev.status === "completed" || ev.status === "error") map[ev.stage] = ev.status;
        else if (!map[ev.stage]) map[ev.stage] = ev.status;
      }
    }
    return map;
  }, [sseEvents]);

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
      const isActive = srcStatus === "completed" && (tgtStatus === "running" || tgtStatus === "started");
      edges.push({
        id: `e-${src}-${tgt}`,
        source: src,
        target: tgt,
        type: "smoothstep",
        animated: isActive,
        style: {
          stroke: srcStatus === "completed" ? "hsl(var(--primary) / 0.5)" : "hsl(var(--muted-foreground) / 0.15)",
          strokeWidth: srcStatus === "completed" ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: srcStatus === "completed" ? "hsl(var(--primary) / 0.5)" : "hsl(var(--muted-foreground) / 0.3)",
        },
      });
    }
    return edges;
  }, [stageStatus]);

  return (
    <div className="h-full w-full">
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
        <Background color="hsl(var(--muted-foreground) / 0.04)" gap={24} size={1} />
        <Controls className="!border-border/40 !bg-card/80 !text-muted-foreground [&>button]:!border-border/30 [&>button]:!bg-muted/30 [&>button]:!text-muted-foreground hover:[&>button]:!bg-muted/50" />
        <MiniMap
          nodeColor="#fff"
          maskColor="hsl(var(--muted-foreground) / 0.08)"
          className="!border-border/30 !rounded-lg"
          style={{ width: 100, height: 60 }}
        />
      </ReactFlow>
    </div>
  );
}
