"use client";

import { useMemo, useCallback } from "react";
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
import { Crown, Briefcase, UserCircle, CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react";

const typeIcon = { ceo: Crown, executive: Briefcase, specialist: UserCircle };
const typeColor = {
  ceo: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  executive: "text-primary bg-primary/10 border-primary/30",
  specialist: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

const statusBorder: Record<string, string> = {
  completed: "border-emerald-500/30 bg-emerald-500/[0.03]",
  running:   "border-blue-500/40 bg-blue-500/[0.05]",
  failed:    "border-red-500/30 bg-red-500/[0.03]",
  pending:   "border-border/30 bg-background/30",
};

interface OrgNodeData {
  id: string; type: string; status: string; title: string;
  confidence: number; runtime: number; role?: string;
}

function OrgTreeNode({ data }: NodeProps) {
  const d = data as unknown as OrgNodeData;
  const selectNode = useInspectorStore((s) => s.selectNode);
  const Icon = typeIcon[d.type as keyof typeof typeIcon] ?? UserCircle;
  const colorSet = typeColor[d.type as keyof typeof typeColor] ?? typeColor.specialist;
  const isRunning = d.status === "running";

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 250, damping: 22, mass: 0.8 }}
      className={cn(
        "group cursor-pointer rounded-xl border-2 px-3 py-2.5 transition-all duration-200 hover:scale-[1.02] min-w-[140px]",
        statusBorder[d.status] ?? statusBorder.pending,
        isRunning && "shadow-[0_0_12px_rgba(59,130,246,0.12)]",
      )}
      onClick={() => selectNode(d.id)}
    >
      <Handle type="target" position={Position.Top} className="!border-border !bg-muted-foreground/30" />
      <div className="flex items-center gap-2">
        <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", colorSet)}>
          {isRunning ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : d.status === "completed" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : d.status === "failed" ? (
            <XCircle className="h-3 w-3" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold leading-tight text-foreground/90">{d.title}</div>
          {d.role && <div className="truncate text-[9px] text-muted-foreground/60">{d.role}</div>}
        </div>
      </div>
      {d.confidence > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", d.confidence >= 0.8 ? "bg-emerald-400" : d.confidence >= 0.5 ? "bg-amber-400" : "bg-red-400")}
              initial={{ width: 0 }}
              animate={{ width: `${d.confidence * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60">{(d.confidence * 100).toFixed(0)}%</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!border-border !bg-muted-foreground/30" />
    </motion.div>
  );
}

const nodeTypes = { orgTreeNode: OrgTreeNode };

export function OrgGraph() {
  const { nodes: nodeData } = useExecutionNodes();
  const selectNode = useInspectorStore((s) => s.selectNode);

  const layout = useMemo(() => {
    const ceo = nodeData.find(n => n.type === "ceo");
    const execs = nodeData.filter(n => n.type === "executive");
    const specs = nodeData.filter(n => n.type === "specialist");

    const perExec = Math.max(1, Math.ceil(specs.length / Math.max(1, execs.length)));

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // CEO
    if (ceo) {
      flowNodes.push({
        id: ceo.id, type: "orgTreeNode",
        position: { x: execs.length * 80, y: 0 },
        data: { ...ceo },
      });
    }

    // Executives
    execs.forEach((ex, i) => {
      const x = Math.max(0, i * 160 - (execs.length - 1) * 80 + 80);
      flowNodes.push({
        id: ex.id, type: "orgTreeNode",
        position: { x, y: 110 },
        data: { ...ex },
      });
      if (ceo) {
        flowEdges.push({
          id: `e-ceo-${ex.id}`, source: ceo.id, target: ex.id,
          type: "smoothstep",
          animated: ex.status === "running",
          style: { stroke: ex.status === "completed" ? "hsl(var(--primary) / 0.4)" : "hsl(var(--muted-foreground) / 0.15)", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: ex.status === "completed" ? "hsl(var(--primary) / 0.4)" : "hsl(var(--muted-foreground) / 0.2)" },
        });
      }
    });

    // Specialists
    specs.forEach((sp, i) => {
      const execIdx = Math.min(i, execs.length - 1);
      const offsetInGroup = Math.floor(i / Math.max(1, execs.length));
      const ex = execs[execIdx] ?? execs[0];
      if (!ex) return;

      const xBase = execIdx * 160 - (execs.length - 1) * 80 + 80;
      const x = xBase + (offsetInGroup % perExec) * 40 - (perExec - 1) * 20;
      const y = 220 + Math.floor(offsetInGroup / perExec) * 90;

      flowNodes.push({
        id: sp.id, type: "orgTreeNode",
        position: { x, y },
        data: { ...sp },
      });
      flowEdges.push({
        id: `e-${ex.id}-${sp.id}`, source: ex.id, target: sp.id,
        type: "smoothstep",
        animated: false,
        style: { stroke: "hsl(var(--muted-foreground) / 0.1)", strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--muted-foreground) / 0.15)" },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [nodeData]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={layout.nodes}
        edges={layout.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.3}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted-foreground) / 0.04)" gap={24} size={1} />
        <Controls className="!border-border/40 !bg-card/80 !text-muted-foreground [&>button]:!border-border/30 [&>button]:!bg-muted/30 [&>button]:!text-muted-foreground hover:[&>button]:!bg-muted/50" />
        <MiniMap
          nodeColor={(n) => n.data?.status === "completed" ? "hsl(var(--success))" : n.data?.status === "running" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
          maskColor="hsl(var(--muted-foreground) / 0.06)"
          className="!border-border/30 !rounded-lg"
          style={{ width: 100, height: 80 }}
        />
      </ReactFlow>
    </div>
  );
}
