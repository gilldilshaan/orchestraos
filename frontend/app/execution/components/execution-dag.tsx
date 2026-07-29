"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
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
import { useExecutionNodes } from "@/hooks/use-execution";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  AlertTriangle,
  Circle,
} from "lucide-react";

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: typeof Circle }> = {
  completed: { color: "text-success", bg: "bg-success/[0.06]", border: "border-success/40", icon: CheckCircle2 },
  running: { color: "text-primary", bg: "bg-primary/[0.08]", border: "border-primary/50", icon: Loader2 },
  failed: { color: "text-destructive", bg: "bg-destructive/[0.06]", border: "border-destructive/40", icon: XCircle },
  retrying: { color: "text-warning", bg: "bg-warning/[0.06]", border: "border-warning/50", icon: AlertTriangle },
  pending: { color: "text-muted-foreground", bg: "bg-muted/20", border: "border-border/30", icon: Circle },
  ready: { color: "text-cyan-400", bg: "bg-cyan-400/[0.06]", border: "border-cyan-400/40", icon: Circle },
};

const PHASE_ORDER = [
  "Compile",
  "Plan",
  "Organize",
  "Executive: CTO",
  "Executive: CFO",
  "Executive: COO",
  "Executive: CMO",
  "Executive: CPO",
  "Specialists",
  "Supervisor",
  "Decision",
];

function DAGNode({ data }: NodeProps) {
  const d = data as unknown as { label: string; status: string };
  const cfg = statusConfig[d.status] || statusConfig.pending;
  const Icon = cfg.icon;
  const isRunning = d.status === "running";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 min-w-[130px] transition-all",
        cfg.border, cfg.bg,
        d.status === "running" && "shadow-[0_0_12px_rgba(59,130,246,0.2)]"
      )}
    >
      <Handle type="target" position={Position.Left} className="!border-border !bg-muted-foreground/30" />
      {isRunning ? (
        <Loader2 className={cn("h-4 w-4 animate-spin", cfg.color)} />
      ) : (
        <Icon className={cn("h-4 w-4", cfg.color)} />
      )}
      <div className="min-w-0">
        <div className="text-xs font-medium leading-tight">{d.label}</div>
        <div className="text-[10px] text-muted-foreground capitalize">{d.status}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!border-border !bg-muted-foreground/30" />
    </motion.div>
  );
}

const nodeTypes = { dagNode: DAGNode };

export function ExecutionDAG() {
  const { nodes: nodeData } = useExecutionNodes();

  const dagNodes: Node[] = useMemo(() => {
    const items = [
      { id: "compile", label: "Compile", status: "completed", phase: 0 },
      { id: "plan", label: "Plan", status: "completed", phase: 1 },
      { id: "organize", label: "Organize", status: "completed", phase: 2 },
      ...nodeData
        .filter((n) => n.type === "executive")
        .map((n) => ({ id: n.id, label: n.title, status: n.status, phase: 3 })),
      { id: "specialists", label: "Specialists", status: "running", phase: 4 },
      { id: "supervisor", label: "Supervisor", status: "running", phase: 5 },
      { id: "decision", label: "Decision", status: "pending", phase: 6 },
    ];

    return items.map((item, i) => ({
      id: item.id,
      type: "dagNode",
      position: { x: 30 + i * 180, y: item.phase === 3 ? (items.indexOf(item) % 2 === 0 ? 20 : 90) : 60 },
      data: { label: item.label, status: item.status },
    }));
  }, [nodeData]);

  const dagEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < dagNodes.length - 1; i++) {
      edges.push({
        id: `e${i}`,
        source: dagNodes[i].id,
        target: dagNodes[i + 1].id,
        type: "smoothstep",
        animated: true,
        style: { stroke: "hsl(var(--muted-foreground) / 0.3)", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--muted-foreground) / 0.3)" },
      });
    }
    return edges;
  }, [dagNodes]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={dagNodes}
        edges={dagEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
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
