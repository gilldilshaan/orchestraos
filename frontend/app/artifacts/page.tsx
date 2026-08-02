"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useArtifactsQuery } from "@/hooks/use-snapshot";
import Link from "next/link";
import { useLatestObjectiveIdQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton, CardSkeleton } from "@/components/skeleton";
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
    <Suspense fallback={<PageSkeleton />}>
      <ArtifactsContent />
    </Suspense>
  );
}

function ArtifactsContent() {
  const searchParams = useSearchParams();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const urlId = searchParams.get("id");
  const { data: latestId } = useLatestObjectiveIdQuery(!urlId);
  const objectiveId = urlId ?? latestId ?? null;

  // Sync URL param to global execution context
  useEffect(() => {
    if (urlId) {
      setActiveObjectiveId(urlId);
    }
  }, [urlId, setActiveObjectiveId]);
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
      <PageHeader
        kicker="Explore"
        title="Artifact Explorer"
        description="Execution artifacts, telemetry, and snapshot data"
        meta={
          <span className="chip">{totalFiles} artifacts</span>
        }
      />

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          <CardSkeleton className="h-[560px]" />
          <CardSkeleton className="h-[560px]" />
        </div>
      )}

      {!isLoading && totalFiles === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EmptyState
            icon={<Archive className="h-5 w-5" />}
            title="No artifacts found"
            description="Execution events, agent telemetry, and snapshots will appear here once an objective runs through the pipeline."
            action={
              <Link
                href="/objective"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/60 px-3.5 py-2 text-xs font-medium text-foreground/70 transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
              >
                <Orbit className="h-3.5 w-3.5" />
                Start a new objective
              </Link>
            }
          />
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
                  className="input py-1.5 pl-7 pr-2 text-[11px]"
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
                <EmptyState
                  compact
                  icon={<MousePointerClick className="h-5 w-5" />}
                  title="No file selected"
                  description="Select an artifact from the tree to view its contents."
                />
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
