"use client";

import { motion } from "motion/react";
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

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function DashboardPage() {
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero / Command Center */}
      <motion.div variants={sectionVariants}>
        <HeroSection />
      </motion.div>

      {/* Runtime Metrics */}
      <motion.div variants={sectionVariants}>
        <MetricGrid />
      </motion.div>

      {/* Active Execution + System Health */}
      <motion.div variants={sectionVariants} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActiveExecution />
        </div>
        <div>
          <SystemHealth />
        </div>
      </motion.div>

      {/* Organization Preview + Live Activity */}
      <motion.div variants={sectionVariants} className="grid gap-6 lg:grid-cols-3">
        <div>
          <OrganizationPreview />
        </div>
        <div className="lg:col-span-2">
          <LiveActivity />
        </div>
      </motion.div>

      {/* Recent Runs */}
      <motion.div variants={sectionVariants}>
        <RecentRuns />
      </motion.div>

      {/* Benchmarks + Decisions */}
      <motion.div variants={sectionVariants} className="grid gap-6 lg:grid-cols-2">
        <BenchmarkPreview />
        <DecisionPreview />
      </motion.div>

      {/* Footer */}
      <motion.div variants={sectionVariants}>
        <FooterStatus />
      </motion.div>
    </motion.div>
  );
}
