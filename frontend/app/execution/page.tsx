"use client";

import { motion } from "motion/react";
import { PanelLayout } from "./components/panel-layout";
import { TimelinePanel } from "./components/timeline-panel";
import { OrgGraph } from "./components/org-graph";
import { ExecutionDAG } from "./components/execution-dag";
import { InspectorPanel } from "./components/inspector-panel";
import { TopToolbar } from "./components/top-toolbar";
import { MetricsRibbon } from "./components/metrics-ribbon";
import { useViewStore } from "@/store/execution-stores";
import { useExecutionRun, useExecutionNodes } from "@/hooks/use-execution";
import { HealthBadge } from "@/components/health-badge";
import { OrganizationUniverse } from "@/components/3d/scene-wrapper";

export default function ExecutionPage() {
  const { centerView } = useViewStore();
  const { run } = useExecutionRun();
  const { nodes: orgNodes } = useExecutionNodes();

  const universeNodes = orgNodes.map((n) => ({
    id: n.id,
    type: n.type as "ceo" | "executive" | "specialist",
    title: n.title,
    status: n.status,
    confidence: n.confidence,
    runtime: n.runtime,
  }));

  return (
    <div className="relative flex h-[calc(100vh-var(--topbar-height)-var(--statusbar-height)-2rem)] flex-col">
      <div className="shrink-0">
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Mission Control</h1>
              <p className="text-[11px] text-muted-foreground">{run.objective}</p>
            </div>
            <HealthBadge status="running" size="sm" />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="font-mono">{run.id}</span>
            <span>Phase: {run.currentPhase}</span>
            <span>ETA: {run.eta}</span>
          </div>
        </div>
        <TopToolbar />
      </div>

      <div className="flex-1 min-h-0">
        <PanelLayout
          left={<TimelinePanel />}
          center={
            centerView === "organization" ? (
              <div className="h-full w-full rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                <OrganizationUniverse
                  nodes={universeNodes}
                  isExecuting={run.status === "running"}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <OrgGraph />
            )
          }
          right={<InspectorPanel />}
        />
      </div>

      <MetricsRibbon />
    </div>
  );
}
