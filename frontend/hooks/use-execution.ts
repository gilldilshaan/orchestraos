"use client";

import { useState, useCallback } from "react";
import type { ExecutionEvent, EventType } from "@/types";

export interface OrgNodeData {
  id: string;
  type: "ceo" | "executive" | "specialist";
  title: string;
  role?: string;
  status: "pending" | "ready" | "running" | "completed" | "failed" | "retrying";
  confidence: number;
  runtime: number;
  tokenUsage: number;
  retries: number;
  capabilities: string[];
  description?: string;
}

export interface ExecutionEventEx extends ExecutionEvent {
  id: string;
  type: EventType;
  timestamp: string;
  source: string;
  component: string;
  message: string;
  description?: string;
  confidence?: number;
  executionTime?: number;
  metadata?: Record<string, unknown>;
}

const NOW = Date.now();
const T = (offset: number) => new Date(NOW + offset).toISOString();

const MOCK_EVENTS: ExecutionEventEx[] = [
  { id: "evt_01", type: "run_started", timestamp: T(0), source: "system", component: "Orchestrator", message: "Run started", description: "New execution initialised", executionTime: 0 },
  { id: "evt_02", type: "organization_created", timestamp: T(100), source: "system", component: "Compiler", message: "Organization created", description: "Organization structure compiled from objective", executionTime: 98 },
  { id: "evt_03", type: "node_created", timestamp: T(200), source: "system", component: "CEO", message: "CEO node created", description: "Strategic Director initialised", confidence: 0.95 },
  { id: "evt_04", type: "task_started", timestamp: T(300), source: "system", component: "CEO", message: "CEO analysis started", description: "Analysing objective requirements" },
  { id: "evt_05", type: "node_executing", timestamp: T(400), source: "system", component: "CEO", message: "CEO analysis in progress", description: "Evaluating market, domain, complexity", executionTime: 345 },
  { id: "evt_06", type: "node_completed", timestamp: T(1200), source: "system", component: "CEO", message: "CEO analysis completed", description: "Strategic direction established", confidence: 0.93, executionTime: 890 },
  { id: "evt_07", type: "task_completed", timestamp: T(1250), source: "system", component: "CEO", message: "CEO task finished", description: "Moving to organisation generation", executionTime: 950 },
  { id: "evt_08", type: "node_created", timestamp: T(1300), source: "system", component: "OrgGenerator", message: "5 executives created", description: "CTO, CFO, COO, CMO, CPO", confidence: 0.91 },
  { id: "evt_09", type: "task_started", timestamp: T(1400), source: "system", component: "CTO", message: "CTO execution started", description: "Technology strategy planning" },
  { id: "evt_10", type: "task_started", timestamp: T(1410), source: "system", component: "CFO", message: "CFO execution started", description: "Financial modelling" },
  { id: "evt_11", type: "task_started", timestamp: T(1420), source: "system", component: "COO", message: "COO execution started", description: "Operations planning" },
  { id: "evt_12", type: "node_created", timestamp: T(1500), source: "system", component: "CTO", message: "3 specialists assigned to CTO", description: "ML Engineer, Data Analyst, Infra Engineer" },
  { id: "evt_13", type: "task_started", timestamp: T(1600), source: "system", component: "ML Engineer", message: "ML Engineer specialist started", description: "Model architecture design" },
  { id: "evt_14", type: "node_executing", timestamp: T(1800), source: "system", component: "ML Engineer", message: "ML Engineer in progress", description: "Building recommendation pipeline" },
  { id: "evt_15", type: "executive_report", timestamp: T(2200), source: "system", component: "CTO", message: "CTO report generated", description: "Technology stack recommendation", confidence: 0.92, executionTime: 800 },
  { id: "evt_16", type: "node_completed", timestamp: T(2250), source: "system", component: "CTO", message: "CTO completed", description: "Technology strategy finalised", confidence: 0.92, executionTime: 850 },
  { id: "evt_17", type: "specialist_report", timestamp: T(2300), source: "system", component: "ML Engineer", message: "ML Engineer report ready", description: "Model architecture complete", confidence: 0.91, executionTime: 700 },
  { id: "evt_18", type: "supervisor_analysis", timestamp: T(3000), source: "system", component: "Supervisor", message: "Supervisor analysis completed", description: "Cross-dept coordination review", confidence: 0.88 },
  { id: "evt_19", type: "decision_created", timestamp: T(3500), source: "system", component: "DecisionMaker", message: "Decision generated", description: "Technology Stack Selection", confidence: 0.89, executionTime: 500 },
  { id: "evt_20", type: "run_completed", timestamp: T(4000), source: "system", component: "Orchestrator", message: "Run completed", description: "Full execution cycle finished", executionTime: 4000 },
  { id: "evt_21", type: "node_retry", timestamp: T(2800), source: "system", component: "Security Analyst", message: "Security Analyst retrying", description: "Attempt 2 of 3", confidence: 0.65, executionTime: 200 },
  { id: "evt_22", type: "node_failed", timestamp: T(3200), source: "system", component: "QA Lead", message: "QA Lead failed", description: "Insufficient test coverage data", confidence: 0.34 },
];

export interface ExecutionNodeData {
  id: string;
  type: "ceo" | "executive" | "specialist";
  title: string;
  role: string;
  status: "pending" | "ready" | "running" | "completed" | "failed" | "retrying";
  confidence: number;
  runtime: number;
  tokenUsage: number;
  retries: number;
  capabilities: string[];
  description: string;
}

const MOCK_NODES: ExecutionNodeData[] = [
  { id: "ceo_01", type: "ceo", title: "Strategic Director", role: "CEO", status: "completed", confidence: 0.95, runtime: 0.89, tokenUsage: 1240, retries: 0, capabilities: ["Strategic Planning", "Market Analysis", "Decision Making"], description: "Defines overall strategy and direction" },
  { id: "exec_01", type: "executive", title: "CTO", role: "Chief Technology Officer", status: "completed", confidence: 0.92, runtime: 0.85, tokenUsage: 980, retries: 0, capabilities: ["Technology Strategy", "Architecture", "Team Leadership"], description: "Technology vision and execution" },
  { id: "exec_02", type: "executive", title: "CFO", role: "Chief Financial Officer", status: "completed", confidence: 0.88, runtime: 0.72, tokenUsage: 860, retries: 0, capabilities: ["Financial Planning", "Budgeting", "Risk Management"], description: "Financial strategy and planning" },
  { id: "exec_03", type: "executive", title: "COO", role: "Chief Operations Officer", status: "running", confidence: 0.76, runtime: 0.45, tokenUsage: 620, retries: 0, capabilities: ["Operations", "Logistics", "Process Optimization"], description: "Operational execution" },
  { id: "exec_04", type: "executive", title: "CMO", role: "Chief Marketing Officer", status: "completed", confidence: 0.90, runtime: 0.78, tokenUsage: 910, retries: 0, capabilities: ["Marketing", "Brand Strategy", "Growth"], description: "Market positioning and growth" },
  { id: "exec_05", type: "executive", title: "CPO", role: "Chief Product Officer", status: "pending", confidence: 0.0, runtime: 0, tokenUsage: 0, retries: 0, capabilities: ["Product Strategy", "UX", "Roadmap"], description: "Product vision and execution" },
  { id: "spec_01", type: "specialist", title: "ML Engineer", role: "Machine Learning Specialist", status: "completed", confidence: 0.91, runtime: 0.7, tokenUsage: 1560, retries: 0, capabilities: ["ML Models", "Data Pipelines", "NLP"], description: "Builds and deploys ML models" },
  { id: "spec_02", type: "specialist", title: "Data Analyst", role: "Data Analyst", status: "running", confidence: 0.72, runtime: 0.35, tokenUsage: 480, retries: 0, capabilities: ["Data Analysis", "Visualization", "Reporting"], description: "Analyses data for insights" },
  { id: "spec_03", type: "specialist", title: "Infra Engineer", role: "Infrastructure Engineer", status: "completed", confidence: 0.89, runtime: 0.65, tokenUsage: 780, retries: 0, capabilities: ["Cloud", "DevOps", "Scaling"], description: "Builds and maintains infrastructure" },
  { id: "spec_04", type: "specialist", title: "Security Analyst", role: "Security Specialist", status: "retrying", confidence: 0.65, runtime: 0.2, tokenUsage: 340, retries: 1, capabilities: ["Security", "Compliance", "Audit"], description: "Ensures security compliance" },
  { id: "spec_05", type: "specialist", title: "UX Researcher", role: "UX Researcher", status: "pending", confidence: 0.0, runtime: 0, tokenUsage: 0, retries: 0, capabilities: ["User Research", "Usability", "Testing"], description: "Conducts user research" },
  { id: "spec_06", type: "specialist", title: "QA Lead", role: "Quality Assurance Lead", status: "failed", confidence: 0.34, runtime: 0.15, tokenUsage: 210, retries: 2, capabilities: ["Testing", "Automation", "CI/CD"], description: "Ensures quality standards" },
];

export function useExecutionEvents() {
  const [events] = useState<ExecutionEventEx[]>(MOCK_EVENTS);
  const [paused] = useState(false);
  return { events, paused, totalEvents: events.length };
}

export function useExecutionNodes() {
  const [nodes] = useState<ExecutionNodeData[]>(MOCK_NODES);
  return { nodes, totalNodes: nodes.length };
}

export function useExecutionRun() {
  const [currentRun] = useState({
    id: "run_01j5a",
    objective: "E-commerce Platform Expansion",
    status: "running" as const,
    progress: 62,
    currentPhase: "Execution",
    currentExecutive: "COO",
    activeSpecialists: 3,
    eta: "~1.8s",
    startedAt: new Date(NOW - 12000).toISOString(),
  });
  return { run: currentRun };
}
