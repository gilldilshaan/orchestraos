"use client";

import { motion } from "motion/react";
import { OrganizationUniverse } from "@/components/3d/scene-wrapper";

interface LevelMember {
  name: string;
  status: "completed" | "running" | "pending";
  confidence: number;
}

interface LevelGroup {
  title: string;
  members: LevelMember[];
}

const ceo: LevelMember = {
  name: "Strategic Director",
  status: "completed",
  confidence: 0.95,
};

const groups: LevelGroup[] = [
  {
    title: "Executives",
    members: [
      { name: "CTO", status: "completed", confidence: 0.92 },
      { name: "CFO", status: "completed", confidence: 0.88 },
      { name: "COO", status: "running", confidence: 0.76 },
      { name: "CMO", status: "completed", confidence: 0.90 },
      { name: "CPO", status: "pending", confidence: 0.0 },
    ],
  },
  {
    title: "Specialists",
    members: [
      { name: "ML Engineer", status: "completed", confidence: 0.91 },
      { name: "Data Analyst", status: "completed", confidence: 0.87 },
      { name: "UX Researcher", status: "running", confidence: 0.72 },
      { name: "Infra Engineer", status: "completed", confidence: 0.89 },
      { name: "Security Analyst", status: "pending", confidence: 0.0 },
      { name: "QA Lead", status: "running", confidence: 0.68 },
    ],
  },
];

const universeNodes = [
  { id: "ceo_01", type: "ceo" as const, title: "Strategic Director", status: "completed", confidence: 0.95, runtime: 1.2 },
  { id: "exec_01", type: "executive" as const, title: "CTO", status: "completed", confidence: 0.92, runtime: 2.1 },
  { id: "exec_02", type: "executive" as const, title: "CFO", status: "completed", confidence: 0.88, runtime: 1.8 },
  { id: "exec_03", type: "executive" as const, title: "COO", status: "running", confidence: 0.76, runtime: 0.5 },
  { id: "exec_04", type: "executive" as const, title: "CMO", status: "completed", confidence: 0.90, runtime: 1.5 },
  { id: "exec_05", type: "executive" as const, title: "CPO", status: "pending", confidence: 0.0, runtime: 0 },
  { id: "spec_01", type: "specialist" as const, title: "ML Engineer", status: "completed", confidence: 0.91, runtime: 0.8 },
  { id: "spec_02", type: "specialist" as const, title: "Data Analyst", status: "completed", confidence: 0.87, runtime: 0.6 },
  { id: "spec_03", type: "specialist" as const, title: "UX Researcher", status: "running", confidence: 0.72, runtime: 0.3 },
  { id: "spec_04", type: "specialist" as const, title: "Infra Engineer", status: "completed", confidence: 0.89, runtime: 0.7 },
  { id: "spec_05", type: "specialist" as const, title: "Security Analyst", status: "pending", confidence: 0.0, runtime: 0 },
  { id: "spec_06", type: "specialist" as const, title: "QA Lead", status: "running", confidence: 0.68, runtime: 0.2 },
];

export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">
          Organization Explorer
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hierarchical view of the dynamically generated organization
        </p>
      </motion.div>

      {/* 3D Organization Universe */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="h-[400px] overflow-hidden rounded-xl border border-border/50 bg-card/30"
      >
        <OrganizationUniverse
          nodes={universeNodes}
          isExecuting
          className="h-full w-full"
        />
      </motion.div>

      {/* CEO level */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border/50 bg-card"
      >
        <div className="border-b border-border/50 px-5 py-3">
          <h3 className="text-sm font-medium">CEO</h3>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <MemberCard {...ceo} />
        </div>
      </motion.div>

      {/* Group levels */}
      <div className="space-y-6">
        {groups.map((group, gi) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + gi * 0.1 }}
            className="rounded-xl border border-border/50 bg-card"
          >
            <div className="border-b border-border/50 px-5 py-3">
              <h3 className="text-sm font-medium">{group.title}</h3>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.members.map((m) => (
                <MemberCard key={m.name} {...m} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MemberCard({ name, status, confidence }: LevelMember) {
  const statusColor =
    status === "completed"
      ? "bg-success/10 text-success border-success/20"
      : status === "running"
        ? "bg-primary/10 text-primary border-primary/20"
        : "bg-muted text-muted-foreground border-border/50";

  const statusDotClass =
    status === "running"
      ? "bg-primary animate-pulse-dot"
      : status === "completed"
        ? "bg-success"
        : "bg-muted-foreground";

  return (
    <motion.div
      className="group relative overflow-hidden rounded-lg border border-border/50 bg-background/50 p-4 transition-all duration-200 hover:bg-muted/30"
      whileHover={{ y: -1 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      {confidence > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Confidence</span>
            <span className="font-mono">{(confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-success"
              initial={{ width: 0 }}
              animate={{ width: `${confidence * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
