"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useArtifactsQuery } from "@/hooks/use-snapshot";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import {
  Folder, FileJson, FileText, ChevronRight,
  Search, Clock, Cpu, DollarSign, Archive, MousePointerClick, Orbit,
} from "lucide-react";

interface TreeNode {
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
  data?: unknown;
  metadata?: Record<string, unknown>;
}

export default function ArtifactsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <ArtifactsContent />
    </Suspense>
  );
}

function ArtifactsContent() {
  const searchParams = useSearchParams();
  const objectiveId = searchParams.get("id");
  const { events, telemetry, snapshot, isLoading } = useArtifactsQuery(objectiveId);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(["events", "telemetry"]));
  const [selectedFile, setSelectedFile] = useState<{ name: string; data: unknown } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const tree: TreeNode[] = useMemo(() => {
    const nodes: TreeNode[] = [];

    // Events
    if (events.length > 0) {
      nodes.push({
        name: "execution_events",
        type: "folder",
        children: events.map((e) => ({
          name: `event_${e.event_order}_${e.stage}.json`,
          type: "file" as const,
          data: e,
          metadata: {
            stage: e.stage,
            status: e.status,
            created_at: e.created_at,
          },
        })),
      });
    }

    // Telemetry
    if (telemetry.length > 0) {
      nodes.push({
        name: "agent_telemetry",
        type: "folder",
        children: telemetry.map((t) => ({
          name: `${t.agent_name ?? t.agent_id}_${t.stage}.json`,
          type: "file" as const,
          data: t,
          metadata: {
            agent: t.agent_name ?? t.agent_id,
            stage: t.stage,
            status: t.status,
            model: t.model,
          },
        })),
      });
    }

    // Snapshot
    if (snapshot) {
      nodes.push({
        name: "execution_snapshot",
        type: "folder",
        children: [
          {
            name: "snapshot_metadata.json",
            type: "file",
            data: {
              id: snapshot.id,
              objective_id: snapshot.objective_id,
              version: snapshot.snapshot_version,
              created_at: snapshot.created_at,
              updated_at: snapshot.updated_at,
            },
          },
          ...(snapshot.snapshot_data
            ? [
                {
                  name: "snapshot_data.json",
                  type: "file" as const,
                  data: snapshot.snapshot_data,
                },
              ]
            : []),
        ],
      });
    }

    return nodes;
  }, [events, telemetry, snapshot]);

  const filteredTree = useMemo(() => {
    if (!searchQuery) return tree;
    const q = searchQuery.toLowerCase();
    const filterNode = (node: TreeNode): TreeNode | null => {
      if (node.type === "file") {
        return node.name.toLowerCase().includes(q) ? node : null;
      }
      const filteredChildren = (node.children ?? [])
        .map(filterNode)
        .filter(Boolean) as TreeNode[];
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };
    return tree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [tree, searchQuery]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleFileClick = (name: string, data: unknown) => {
    setSelectedFile({ name, data });
  };

  const totalFiles = useMemo(() => {
    let count = 0;
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.type === "file") count++;
        if (n.children) walk(n.children);
      }
    };
    walk(tree);
    return count;
  }, [tree]);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Artifact Explorer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Execution artifacts, telemetry, and snapshot data
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground/60">
            {totalFiles} artifacts
          </span>
        </div>
      </motion.div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading artifacts...
        </div>
      )}

      {!isLoading && totalFiles === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-xl border border-border/50 bg-card p-12 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30">
            <Archive className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-foreground/80">No artifacts found</h2>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground/50">
            Execution events, agent telemetry, and snapshots will appear here once an objective runs through the pipeline.
          </p>
          <Link
            href="/objective"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/60 px-3.5 py-2 text-xs font-medium text-foreground/70 transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
          >
            <Orbit className="h-3.5 w-3.5" />
            Start a new objective
          </Link>
        </motion.div>
      )}

      {totalFiles > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          {/* Tree */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-border/50 bg-card"
          >
            <div className="border-b border-border/30 px-4 py-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter artifacts..."
                  className="w-full rounded-md border border-border/30 bg-muted/20 py-1.5 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin p-2">
              {filteredTree.map((node) => (
                <TreeNodeItem
                  key={node.name}
                  node={node}
                  path={node.name}
                  expandedPaths={expandedPaths}
                  onToggle={toggleExpand}
                  onSelect={handleFileClick}
                />
              ))}
            </div>
          </motion.div>

          {/* Viewer */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-lg border border-border/50 bg-card"
          >
            <div className="border-b border-border/30 px-4 py-3">
              <h3 className="text-sm font-medium">
                {selectedFile ? selectedFile.name : "Select an artifact"}
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin p-4">
              {selectedFile ? (
                <pre className="font-mono text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedFile.data, null, 2)}
                </pre>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <MousePointerClick className="h-5 w-5 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground/50">Select an artifact from the tree to view its contents</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function TreeNodeItem({
  node,
  path,
  expandedPaths,
  onToggle,
  onSelect,
  depth = 0,
}: {
  node: TreeNode;
  path: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (name: string, data: unknown) => void;
  depth?: number;
}) {
  const isExpanded = expandedPaths.has(path);
  const Icon = node.type === "folder" ? Folder : FileJson;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => onToggle(path)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/20",
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform",
              isExpanded && "rotate-90",
            )}
          />
          <Icon className="h-4 w-4 shrink-0 text-primary/70" />
          <span className="text-xs font-medium text-foreground/80">
            {node.name}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground/50">
            {node.children?.length ?? 0}
          </span>
        </button>
        <AnimatePresence>
          {isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {node.children.map((child) => (
                <TreeNodeItem
                  key={child.name}
                  node={child}
                  path={`${path}/${child.name}`}
                  expandedPaths={expandedPaths}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.name, node.data!)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/20"
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      <FileJson className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      <span className="text-xs text-foreground/70 truncate">
        {node.name}
      </span>
    </button>
  );
}
