"use client";

import { HeroSection } from "./components/hero-section";
import { PipelineRail } from "./components/pipeline-rail";
import { MetricGrid } from "./components/metric-grid";
import { ActiveExecution } from "./components/active-execution";
import { SystemHealth } from "./components/system-health";
import { RecentRuns } from "./components/recent-runs";
import { LiveActivity } from "./components/live-activity";
import { OrganizationPreview } from "./components/organization-preview";
import { BenchmarkPreview } from "./components/benchmark-preview";
import { DecisionPreview } from "./components/decision-preview";
import { ReportPreview } from "./components/report-preview";
import { VelocityChart } from "./components/velocity-chart";
import { SystemScores } from "./components/system-scores";
import { RiskOverview } from "./components/risk-overview";
import { KernelMonitor } from "./components/kernel-monitor";
import { FooterStatus } from "./components/footer-status";

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <HeroSection />

      <PipelineRail />

      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <ActiveExecution />
        </div>
        <div className="lg:col-span-1">
          <SystemHealth />
        </div>
      </div>

      <MetricGrid />

      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <VelocityChart />
        </div>
        <div className="lg:col-span-2">
          <SystemScores />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <LiveActivity />
        </div>
        <div className="lg:col-span-1">
          <RiskOverview />
        </div>
        <div className="lg:col-span-1">
          <OrganizationPreview />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentRuns />
        </div>
        <div className="space-y-5">
          <KernelMonitor />
          <ReportPreview />
          <DecisionPreview />
          <BenchmarkPreview />
        </div>
      </div>

      <FooterStatus />
    </div>
  );
}
