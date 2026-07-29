"use client";

import { useInspectorStore } from "@/store";
import { useExecutionNodes } from "@/hooks/use-execution";
import { HealthBadge } from "@/components/health-badge";
import { ConfidenceBar } from "@/components/confidence-bar";
import { cn } from "@/lib/utils";
import { X, Crown, Briefcase, UserCircle, Activity, FileText, Clock, RotateCcw, Cpu } from "lucide-react";

export function InspectorPanel() {
  const { selectedNodeId, close } = useInspectorStore();
  const { nodes } = useExecutionNodes();
  const node = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h3 className="text-xs font-semibold tracking-tight">
          {node ? "Inspector" : "Organization Summary"}
        </h3>
        {node && (
          <button onClick={close} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {node ? <NodeInspector node={node} /> : <OrgSummary />}
      </div>
    </div>
  );
}

function NodeInspector({ node }: { node: NonNullable<ReturnType<typeof useExecutionNodes>["nodes"]>[number] }) {
  const Icon = node.type === "ceo" ? Crown : node.type === "executive" ? Briefcase : UserCircle;
  const iconColor = node.type === "ceo" ? "text-violet-400 bg-violet-400/10" :
    node.type === "executive" ? "text-primary bg-primary/10" : "text-emerald-400 bg-emerald-400/10";

  return (
    <div className="space-y-4 p-4">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">{node.title}</div>
          <div className="text-xs text-muted-foreground">{node.role}</div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <HealthBadge status={node.status === "retrying" ? "running" : node.status === "completed" ? "completed" : node.status === "failed" ? "failed" : node.status === "running" ? "running" : "idle"} size="sm" />
      </div>

      {/* Description */}
      {node.description && (
        <div className="rounded-lg bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground/80">{node.description}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Confidence", value: node.confidence > 0 ? `${(node.confidence * 100).toFixed(0)}%` : "—", icon: Activity },
          { label: "Runtime", value: node.runtime > 0 ? `${node.runtime.toFixed(2)}s` : "—", icon: Clock },
          { label: "Retries", value: String(node.retries), icon: RotateCcw },
          { label: "Token Usage", value: node.tokenUsage > 0 ? `${node.tokenUsage.toLocaleString()}` : "—", icon: Cpu },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border/30 bg-background/50 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <s.icon className="h-3 w-3" />
              {s.label}
            </div>
            <div className="mt-0.5 font-mono text-xs font-medium tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Confidence bar */}
      {node.confidence > 0 && <ConfidenceBar value={node.confidence} label="Decision Quality" />}

      {/* Capabilities */}
      {node.capabilities.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Capabilities</div>
          <div className="flex flex-wrap gap-1.5">
            {node.capabilities.map((c) => (
              <span key={c} className="rounded-md border border-border/30 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrgSummary() {
  const { nodes } = useExecutionNodes();
  const completed = nodes.filter((n) => n.status === "completed").length;
  const running = nodes.filter((n) => n.status === "running").length;
  const failed = nodes.filter((n) => n.status === "failed").length;
  const pending = nodes.filter((n) => n.status === "pending" || n.status === "ready").length;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
        <h4 className="text-xs font-medium">Execution Status</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: "Completed", value: completed, color: "text-success" },
            { label: "Running", value: running, color: "text-primary" },
            { label: "Failed", value: failed, color: "text-destructive" },
            { label: "Pending", value: pending, color: "text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-background/50 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className={cn("font-mono text-lg font-semibold tabular-nums", s.color)}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {nodes.map((n) => (
          <div key={n.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                n.status === "running" ? "bg-primary animate-pulse-dot" :
                n.status === "completed" ? "bg-success" :
                n.status === "failed" ? "bg-destructive" :
                n.status === "retrying" ? "bg-warning" : "bg-muted-foreground/30"
              )} />
              <span>{n.title}</span>
            </div>
            <span className="font-mono text-[10px] tabular-nums">
              {n.confidence > 0 ? `${(n.confidence * 100).toFixed(0)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
