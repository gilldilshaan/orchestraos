"use client";

import { useState, useEffect } from "react";
import type {
  DashboardSummary,
  RunSummary,
  SystemHealth,
  DecisionData,
} from "@/types";

const MOCK_DASHBOARD: DashboardSummary = {
  average_confidence: 0.87,
  total_runtime: 12.4,
  success_rate: 0.94,
  executives_spawned: 5,
  specialists_spawned: 12,
  health_score: 0.91,
  average_retries: 0.3,
  average_execution_time: 2.8,
  recent_runs: [
    {
      id: "run_01j5a",
      objective: "E-commerce Platform Expansion",
      status: "completed",
      confidence: 0.92,
      duration: 4.2,
      started_at: "2026-07-28T12:00:01Z",
      node_count: 18,
    },
    {
      id: "run_01i4b",
      objective: "AI Customer Support System",
      status: "completed",
      confidence: 0.88,
      duration: 3.8,
      started_at: "2026-07-28T11:30:00Z",
      node_count: 14,
    },
    {
      id: "run_01h3c",
      objective: "Supply Chain Optimization",
      status: "running",
      confidence: 0.76,
      duration: 2.1,
      started_at: "2026-07-28T10:45:00Z",
      node_count: 8,
    },
    {
      id: "run_01g2d",
      objective: "Data Pipeline Migration",
      status: "failed",
      confidence: 0.45,
      duration: 1.5,
      started_at: "2026-07-28T09:15:00Z",
      node_count: 6,
    },
    {
      id: "run_01f1e",
      objective: "Mobile App Launch Strategy",
      status: "completed",
      confidence: 0.95,
      duration: 5.1,
      started_at: "2026-07-28T08:00:00Z",
      node_count: 22,
    },
  ],
  system_health: {
    status: "healthy",
    uptime: 3600 * 48,
    active_runs: 3,
    queue_depth: 2,
  },
};

const MOCK_SYSTEM_HEALTH: SystemHealth = {
  status: "healthy",
  uptime: 172800,
  active_runs: 3,
  queue_depth: 2,
};

const MOCK_DECISIONS: DecisionData[] = [
  {
    id: "dec_01",
    title: "Technology Stack Selection",
    executive_summary:
      "Select between React Native, Flutter, or native development for the mobile platform initiative.",
    confidence: 0.88,
    risk_level: "low",
    risks: ["Vendor lock-in", "Team learning curve", "Performance overhead"],
    tradeoffs: [
      {
        option: "React Native",
        pros: ["Large ecosystem", "Code reuse", "Hot reload"],
        cons: ["Bridge overhead", "Native module complexity"],
      },
      {
        option: "Flutter",
        pros: ["High performance", "Consistent UI", "Fast compilation"],
        cons: ["Dart ecosystem", "Larger binary size"],
      },
    ],
    alternative_options: ["Native Swift + Kotlin", "PWA approach"],
    recommendation:
      "Adopt React Native for its mature ecosystem and team familiarity.",
    reasoning:
      "The team's existing React expertise reduces ramp-up time by approximately 40% compared to Flutter.",
    evidence: [
      "Team has 5 years combined React experience",
      "React Native 0.76 improves bridge performance by 3x",
    ],
    assumptions: [
      "Team can achieve parity within 2 sprints",
      "Native modules are well-documented",
    ],
  },
];

export function useDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(MOCK_DASHBOARD);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return { data, loading, error };
}

export function useRecentRuns() {
  const [runs] = useState<RunSummary[]>(MOCK_DASHBOARD.recent_runs);
  return { runs };
}

export function useSystemHealth() {
  const [health] = useState<SystemHealth>(MOCK_SYSTEM_HEALTH);
  return { health };
}

export function useDecisions() {
  const [decisions] = useState<DecisionData[]>(MOCK_DECISIONS);
  return { decisions };
}

export function useMetrics() {
  const [metrics] = useState({
    totalRuns: 847,
    successRate: 0.94,
    avgRuntime: 2.8,
    executivesSpawned: 5,
    specialistsSpawned: 12,
    avgConfidence: 0.87,
    parallelism: 8,
    healthScore: 0.91,
    avgRetries: 0.3,
  });
  return { metrics };
}
