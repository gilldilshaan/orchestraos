"use client";

import { HeroSection } from "./components/hero-section";
import { MetricGrid } from "./components/metric-grid";
import { ActiveExecution } from "./components/active-execution";
import { SystemHealth } from "./components/system-health";
import { RecentRuns } from "./components/recent-runs";
import { LiveActivity } from "./components/live-activity";
import { OrganizationPreview } from "./components/organization-preview";
import { BenchmarkPreview } from "./components/benchmark-preview";
import { DecisionPreview } from "./components/decision-preview";
import { FooterStatus } from "./components/footer-status";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Section 1 — Hero */}
      <HeroSection />

      {/* Section 2 — Primary Metrics */}
      <MetricGrid />

      {/* Section 3+4 — Active Execution + System Health (side by side) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActiveExecution />
        </div>
        <div>
          <SystemHealth />
        </div>
      </div>

      {/* Section 7+6 — Organization + Live Activity (side by side) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <OrganizationPreview />
        </div>
        <div className="lg:col-span-2">
          <LiveActivity />
        </div>
      </div>

      {/* Section 5 — Recent Runs */}
      <RecentRuns />

      {/* Section 8+9 — Benchmarks + Decision (side by side) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BenchmarkPreview />
        <DecisionPreview />
      </div>

      {/* Section 10 — Footer Status */}
      <FooterStatus />
    </div>
  );
}
