"use client";

import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
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
import { useExecutionNodes, useExecutionRun } from "@/hooks/use-execution";
import { useInspectorStore } from "@/store";
import {
  Crown,
  Briefcase,
  UserCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  AlertTriangle,
  Play,
} from "lucide-react";

const statusColors: Record<string, string> = {
  completed: "border-success/40 bg-success/[0.04]",
  running: "border-primary/50 bg-primary/[0.06]",
  pending: "border-border/40 bg-muted/20",
  failed: "border-destructive/40 bg-destructive/[0.04]",
  retrying: "border-warning/50 bg-warning/[0.06]",
  ready: "border-cyan-400/40 bg-cyan-400/[0.04]",
};

const statusGlow: Record<string, string> = {
  completed: "shadow-[0_0_12px_rgba(16,185,129,0.15)]",
  running: "shadow-[0_0_12px_rgba(59,130,246,0.2)]",
  retrying: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  failed: "shadow-[0_0_12px_rgba(239,68,68,0.15)]",
};

interface OrgNodeData {
  id: string; type: string; status: string; title: string;
  confidence: number; runtime: number;
}

function OrgNode({ data }: NodeProps) {
  const d = data as unknown as OrgNodeData;
  const selectNode = useInspectorStore((s) => s.selectNode);
  const Icon = d.type === "ceo" ? Crown : d.type === "executive" ? Briefcase : UserCircle;
  const isRunning = d.status === "running";

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={cn(
        "group cursor-pointer rounded-xl border-2 px-4 py-3 transition-all duration-300 hover:scale-105 min-w-[160px]",
        statusColors[d.status] || statusColors.pending,
        statusGlow[d.status] || ""
      )}
      onClick={() => selectNode(d.id)}
    >
      <Handle type="target" position={Position.Top} className="!border-border !bg-muted-foreground/30" />
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          d.type === "ceo" ? "bg-violet-400/10 text-violet-400" :
          d.type === "executive" ? "bg-primary/10 text-primary" :
          "bg-emerald-400/10 text-emerald-400"
        )}>
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : d.status === "completed" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : d.status === "failed" ? (
            <XCircle className="h-3.5 w-3.5" />
          ) : d.status === "retrying" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
        </div>
        <div>
          <div className="text-xs font-semibold leading-tight">{d.title}</div>
          <div className="text-[10px] text-muted-foreground capitalize">{d.status}</div>
        </div>
      </div>
      {d.confidence > 0 && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                d.confidence >= 0.8 ? "bg-success" :
                d.confidence >= 0.5 ? "bg-warning" : "bg-destructive"
              )}
              style={{ width: `${d.confidence * 100}%` }}
            />
          </div>
          <span className="font-mono tabular-nums">{(d.confidence * 100).toFixed(0)}%</span>
        </div>
      )}
      {d.runtime > 0 && (
        <div className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground/60">
          {d.runtime.toFixed(2)}s
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!border-border !bg-muted-foreground/30" />
    </motion.div>
  );
}

const nodeTypes = { orgNode: OrgNode };

export function OrgGraph() {
  const { nodes: nodeData } = useExecutionNodes();
  const { run } = useExecutionRun();
  const selectNode = useInspectorStore((s) => s.selectNode);

  const flowNodes: Node[] = nodeData.map((nd, i) => ({
    id: nd.id,
    type: "orgNode",
    position: {
      x: nd.type === "ceo" ? 200 :
         nd.type === "executive" ? 40 + (i % 5) * 120 :
         20 + (i % 6) * 100,
      y: nd.type === "ceo" ? 10 :
         nd.type === "executive" ? 130 :
         280,
    },
    data: { ...nd },
  }));

  const flowEdges: Edge[] = [
    ...nodeData.filter(n => n.type === "executive").map((n) => ({
      id: `ceo->${n.id}`,
      source: "ceo_01",
      target: n.id,
      type: "smoothstep",
      animated: n.status === "running" || n.status === "completed",
      style: { stroke: n.status === "completed" ? "hsl(var(--success))" : "hsl(var(--muted-foreground) / 0.3)", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: n.status === "completed" ? "hsl(var(--success))" : "hsl(var(--muted-foreground) / 0.3)" },
    })),
    ...nodeData.filter(n => n.type === "specialist").map((n) => ({
      id: `exec->${n.id}`,
      source: "exec_01",
      target: n.id,
      type: "smoothstep",
      animated: n.status === "running" || n.status === "completed",
      style: { stroke: n.status === "completed" ? "hsl(var(--success))" : "hsl(var(--muted-foreground) / 0.2)", strokeWidth: 1 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--muted-foreground) / 0.3)" },
    })),
  ];

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted-foreground) / 0.05)" gap={20} />
        <Controls
          className="!border-border/50 !bg-card !text-muted-foreground [&>button]:!border-border/50 [&>button]:!bg-muted [&>button]:!text-muted-foreground hover:[&>button]:!bg-muted/80"
        />
      </ReactFlow>
    </div>
  );
}
