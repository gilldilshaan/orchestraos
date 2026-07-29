"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { useLatestObjectiveIdQuery, useOrganizationQuery } from "@/hooks/use-api";
import { OrganizationUniverse } from "@/components/3d/scene-wrapper";

interface LevelMember {
  name: string;
  status: "completed" | "running" | "pending";
  confidence: number | null;
}

interface LevelGroup {
  title: string;
  members: LevelMember[];
}

export default function OrganizationPage() {
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery();
  const { data: org } = useOrganizationQuery(latestObjectiveId);

  const departments = useMemo(() => org?.departments ?? [], [org]);

  const ceo: LevelMember | null = useMemo(() => {
    if (!departments.length) return null;
    const firstRole = departments[0]?.roles?.[0];
    if (!firstRole) return null;
    return {
      name: departments[0].name,
      status: departments[0].status === "active" ? "completed" : departments[0].status === "proposed" ? "pending" : "running",
      confidence: null,
    };
  }, [departments]);

  const groups: LevelGroup[] = useMemo(() => {
    return departments.map((dept) => ({
      title: dept.name,
      members: (dept.roles ?? []).map((role) => ({
        name: role.title,
        status: role.status === "active" ? "completed" : role.status === "proposed" ? "pending" : "running",
        confidence: null,
      })),
    }));
  }, [departments]);

  const universeNodes = useMemo(() => {
    return departments.flatMap((dept, di) => {
      return (dept.roles ?? []).map((role, ri) => ({
        id: `role_${dept.id ?? di}_${role.id ?? ri}`,
        type: di === 0 && ri === 0 ? "ceo" as const : "executive" as const,
        title: role.title,
        status: role.status === "active" ? "completed" as const : role.status === "proposed" ? "pending" as const : "running" as const,
        confidence: 0,
        runtime: 0,
      }));
    });
  }, [departments]);

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

      {!departments.length ? (
        <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No organization data yet. Run a pipeline to generate an organization structure.
          </p>
        </div>
      ) : (
        <>
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

          {ceo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border/50 bg-card"
            >
              <div className="border-b border-border/50 px-5 py-3">
                <h3 className="text-sm font-medium">Lead Department</h3>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <MemberCard {...ceo} />
              </div>
            </motion.div>
          )}

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
        </>
      )}
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
      {confidence != null && confidence > 0 && (
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
      {confidence == null && (
        <div className="mt-3">
          <div className="text-[11px] text-muted-foreground/50">
            Confidence: Not Available
          </div>
        </div>
      )}
    </motion.div>
  );
}
