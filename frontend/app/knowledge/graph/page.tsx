"use client";

import { useMemo, useEffect, useRef, useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  type KnowledgeGraph as KnowledgeGraphData,
  type KnowledgeGraphNode as KnowledgeNode,
  type KnowledgeNodeType,
  type KnowledgeEdgeType,
} from "@/types";
import { PageHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { EmptyState } from "@/components/empty-state";
import {
  Brain,
  BookOpen,
  Lightbulb,
  RefreshCw,
  Loader2,
  GitBranch,
  Repeat,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const THRESHOLD_OPTIONS = [
  { value: "0.4", label: "0.40 threshold" },
  { value: "0.55", label: "0.55 threshold" },
  { value: "0.7", label: "0.70 threshold" },
  { value: "0.85", label: "0.85 threshold" },
];

function ObjectiveNode({ data }: NodeProps) {
  const d = data as unknown as { label: string; confidence: number };
  const confidence = d.confidence ?? 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative w-[190px] rounded-xl border border-primary/25 bg-card/90 px-3 py-2.5 shadow-[0_0_18px_hsl(var(--primary)/0.07)] backdrop-blur-sm transition-shadow hover:shadow-[0_0_24px_hsl(var(--primary)/0.14)]"
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-border/30 !bg-muted-foreground/30" />
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
          <Brain className="h-3 w-3 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-tight text-foreground/90">
            {d.label}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground/50">
            <span
              className={cn(
                "inline-block h-1 w-8 rounded-full",
                confidence >= 0.8 ? "bg-success" : confidence >= 0.6 ? "bg-amber-500" : "bg-destructive"
              )}
            />
            {Math.round(confidence * 100)}% confidence
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-border/30 !bg-muted-foreground/30" />
    </motion.div>
  );
}

function DerivedNode({ data }: NodeProps) {
  const d = data as unknown as { label: string; kind: "strategy" | "lesson"; count: number };
  const isStrategy = d.kind === "strategy";
  const Icon = isStrategy ? BookOpen : Lightbulb;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group w-[170px] rounded-lg border px-3 py-2 backdrop-blur-sm transition-shadow",
        isStrategy
          ? "border-amber-500/25 bg-amber-500/[0.06] hover:shadow-[0_0_18px_rgba(245,158,11,0.1)]"
          : "border-violet-500/25 bg-violet-500/[0.06] hover:shadow-[0_0_18px_rgba(139,92,246,0.1)]"
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-border/30 !bg-muted-foreground/30" />
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded",
            isStrategy ? "bg-amber-500/15 text-amber-500" : "bg-violet-500/15 text-violet-500"
          )}
        >
          <Icon className="h-3 w-3" />
        </span>
        <p className="line-clamp-2 text-[10px] font-medium leading-snug text-foreground/80">
          {d.label}
        </p>
      </div>
      {d.count > 1 && (
        <p className="mt-1 text-[8px] text-muted-foreground/40">shared by {d.count} objectives</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-border/30 !bg-muted-foreground/30" />
    </motion.div>
  );
}

const nodeTypes = { objective: ObjectiveNode, strategy: DerivedNode, lesson: DerivedNode };

const NODE_W = 210;
const NODE_H = 90;

function layoutGraph(graph: KnowledgeGraphData): { nodes: Node[]; edges: Edge[] } {
  const objectives = graph.nodes.filter((n) => n.type === "objective");
  const strategies = graph.nodes.filter((n) => n.type === "strategy");
  const lessons = graph.nodes.filter((n) => n.type === "lesson");

  const objectiveByKey = new Map(objectives.map((o) => [o.id, o]));
  const derivedChildren = new Map<string, KnowledgeNode[]>();
  const objectivesOf = new Map<string, string>();

  const stratSpacing = Math.max(2, Math.ceil(strategies.length / Math.max(1, objectives.length)));
  const lessonSpacing = Math.max(2, Math.ceil(lessons.length / Math.max(1, objectives.length)));

  let sIdx = 0;
  let lIdx = 0;
  for (const n of strategies) {
    const parent = objectives[sIdx % Math.max(1, objectives.length)]?.id ?? "root";
    const list = derivedChildren.get(parent) ?? [];
    list.push(n);
    derivedChildren.set(parent, list);
    objectivesOf.set(n.id, parent);
    sIdx++;
  }
  for (const n of lessons) {
    const parent = objectives[lIdx % Math.max(1, objectives.length)]?.id ?? "root";
    const list = derivedChildren.get(parent) ?? [];
    list.push(n);
    derivedChildren.set(parent, list);
    objectivesOf.set(n.id, parent);
    lIdx++;
  }

  const nodes: Node[] = [];
  const cols = Math.ceil(Math.sqrt(objectives.length || 1));
  objectives.forEach((o, i) => {
    nodes.push({
      id: o.id,
      type: "objective",
      position: {
        x: (i % cols) * NODE_W * 1.6,
        y: Math.floor(i / cols) * NODE_H * 1.6,
      },
      data: { label: o.label, confidence: o.confidence ?? 0 },
    });
  });

  for (const [parentKey, children] of derivedChildren) {
    const parent = objectiveByKey.get(parentKey);
    const px = parent ? nodes.find((n) => n.id === parent.id)?.position.x ?? 0 : 0;
    const py = parent ? nodes.find((n) => n.id === parent.id)?.position.y ?? 0 : 0;
    children.forEach((child, i) => {
      const colOffset = child.type === "strategy" ? 0 : (stratSpacing - lessonSpacing + 2) * 0.5;
      nodes.push({
        id: child.id,
        type: child.type,
        position: {
          x: px + (i % Math.max(1, Math.ceil(children.length / 2))) * NODE_W * 0.9 + colOffset * NODE_W,
          y: py + NODE_H * 1.4 + Math.floor(i / Math.max(1, Math.ceil(children.length / 2))) * NODE_H * 1.2,
        },
        data: { label: child.label, kind: child.type, count: child.count ?? 1 },
      });
    });
  }

  const styleFor = (type: KnowledgeEdgeType): { stroke: string; strokeWidth: number } => {
    switch (type) {
      case "reuse":
        return { stroke: "hsl(45 93% 47% / 0.55)", strokeWidth: 1.8 };
      case "similarity":
        return { stroke: "hsl(var(--primary) / 0.4)", strokeWidth: 1.4 };
      default:
        return { stroke: "hsl(var(--muted-foreground) / 0.25)", strokeWidth: 1 };
    }
  };

  const arrowColorFor = (type: KnowledgeEdgeType): string => {
    switch (type) {
      case "reuse":
        return "hsl(45 93% 47% / 0.6)";
      case "similarity":
        return "hsl(var(--primary) / 0.5)";
      default:
        return "hsl(var(--muted-foreground) / 0.3)";
    }
  };

  const edges: Edge[] = graph.edges.map((e) => {
    const isReuse = e.type === "reuse";
    const edgeStyle = styleFor(e.type);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: isReuse,
      label: isReuse ? undefined : e.label,
      labelStyle: { fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.5)" },
      style: {
        ...edgeStyle,
        strokeDasharray: e.type === "derived_from" ? "4 4" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: arrowColorFor(e.type),
      },
    };
  });

  return { nodes, edges };
}

function GraphFlow({ data }: { data: KnowledgeGraphData }) {
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, edges } = useMemo(() => layoutGraph(data), [data]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView, data]);

  return (
    <div className="h-full w-full" ref={containerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted-foreground) / 0.03)" gap={24} size={1} />
        <Controls className="!border-border/30 !bg-card/60 !text-muted-foreground/60 [&>button]:!border-border/20 [&>button]:!bg-muted/20 [&>button]:!text-muted-foreground/60 hover:[&>button]:!bg-muted/40" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "objective") return "hsl(var(--primary) / 0.6)";
            return node.type === "strategy" ? "hsl(45 93% 47% / 0.5)" : "hsl(263 90% 66% / 0.5)";
          }}
          maskColor="hsl(var(--muted-foreground) / 0.05)"
          className="!border-border/20 !rounded-lg"
          style={{ width: 110, height: 70 }}
        />
      </ReactFlow>
    </div>
  );
}

const LEGEND = [
  { label: "Objective", color: "hsl(var(--primary))", shape: "square" as const },
  { label: "Strategy", color: "hsl(45 93% 47%)", shape: "square" as const },
  { label: "Lesson", color: "hsl(263 90% 66%)", shape: "square" as const },
  { label: "Reuse", color: "hsl(45 93% 47%)", shape: "line" as const },
  { label: "Similarity", color: "hsl(var(--primary))", shape: "line" as const },
  { label: "Derived from", color: "hsl(var(--muted-foreground))", shape: "line" as const },
];

export default function KnowledgeGraphPage() {
  const [threshold, setThreshold] = useState("0.55");

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["knowledge-graph", threshold],
    queryFn: () =>
      apiClient.get<KnowledgeGraphData>(
        `/memory/graph?memory_limit=80&similarity_threshold=${threshold}`
      ),
    staleTime: 60_000,
  });

  const counts = useMemo(() => {
    const c: Record<KnowledgeNodeType | KnowledgeEdgeType, number> = {
      objective: 0,
      strategy: 0,
      lesson: 0,
      derived_from: 0,
      reuse: 0,
      similarity: 0,
    };
    for (const n of data?.nodes ?? []) c[n.type]++;
    for (const e of data?.edges ?? []) c[e.type]++;
    return c;
  }, [data]);

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        kicker="Knowledge Center"
        title="Knowledge Graph"
        description="How objectives, strategies, and lessons connect — through reuse, similarity, and derivation."
        actions={
          <div className="flex items-center gap-2">
            <Select value={threshold} onValueChange={setThreshold}>
              <SelectTrigger className="w-auto min-w-[150px]">
                <SelectValue placeholder="Threshold" />
              </SelectTrigger>
              <SelectContent>
                {THRESHOLD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      />

      <PremiumCard className="flex-1 overflow-hidden flex flex-col" hoverEffect="none">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/30 px-5 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            {counts.objective} objectives · {counts.strategy} strategies · {counts.lesson} lessons
          </span>
          <span className="hidden h-3 w-px bg-border/30 sm:block" />
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <Repeat className="h-3 w-3 text-amber-500" /> {counts.reuse} reuse edges
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <Sparkles className="h-3 w-3 text-primary" /> {counts.similarity} similarity edges
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <GitBranch className="h-3 w-3 text-muted-foreground/40" /> {counts.derived_from} derived edges
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            {LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                {item.shape === "line" ? (
                  <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                ) : (
                  <span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ backgroundColor: `${item.color}22`, borderColor: `${item.color}66` }} />
                )}
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                icon={<GitBranch className="h-12 w-12 text-muted-foreground/30" />}
                title="Failed to load graph"
                description={(error as Error).message}
                action={<Button onClick={() => refetch()}>Retry</Button>}
              />
            </div>
          ) : !data || data.nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                icon={<GitBranch className="h-12 w-12 text-muted-foreground/30" />}
                title="No knowledge graph yet"
                description="Objective memories, strategies, and lessons will appear here once objectives complete their pipeline."
              />
            </div>
          ) : (
            <ReactFlowProvider>
              <GraphFlow data={data} />
            </ReactFlowProvider>
          )}
        </div>
      </PremiumCard>
    </div>
  );
}
