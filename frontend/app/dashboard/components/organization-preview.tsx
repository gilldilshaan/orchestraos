"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useObjectiveContextStore } from "@/store";
import { useLatestObjectiveIdQuery, useOrganizationQuery } from "@/hooks/use-api";
import { ArrowRight, Building2, Users, Circle } from "lucide-react";
import { PulseRing } from "@/components/premium/page-transition";

const roleColors: Record<string, string> = {
  active: "border-success/20 bg-success/10 text-success shadow-[0_0_10px_-2px_hsl(var(--success)/0.1)]",
  running: "border-primary/20 bg-primary/10 text-primary shadow-[0_0_10px_-2px_hsl(var(--primary)/0.1)]",
  proposed: "border-border/20 bg-muted/10 text-muted-foreground/50",
};

const deptColors = [
  { left: "border-l-sky-400", border: "border-sky-400/20", bg: "bg-sky-400/5", dot: "bg-sky-400", text: "text-sky-400" },
  { left: "border-l-violet-400", border: "border-violet-400/20", bg: "bg-violet-400/5", dot: "bg-violet-400", text: "text-violet-400" },
  { left: "border-l-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5", dot: "bg-emerald-400", text: "text-emerald-400" },
  { left: "border-l-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5", dot: "bg-amber-400", text: "text-amber-400" },
  { left: "border-l-rose-400", border: "border-rose-400/20", bg: "bg-rose-400/5", dot: "bg-rose-400", text: "text-rose-400" },
];

export function OrganizationPreview() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: org } = useOrganizationQuery(objectiveId);

  const departments = org?.departments ?? [];
  const totalHeadCount = org?.total_head_count ?? 0;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">Organization</span>
        </div>
        <Link
          href="/organization"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground/60"
        >
          Open
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="panel-body">
        {departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20">
                <Users className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <motion.div
                className="pointer-events-none absolute -inset-2 rounded-2xl border border-border/10"
                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="text-sm font-medium text-foreground/60">No Organization Yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground/40 leading-relaxed">
              Run a full pipeline to generate departments, roles, and an organizational hierarchy.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.slice(0, 4).map((dept, i) => {
              const colors = deptColors[i % deptColors.length];
              return (
                <motion.div
                  key={dept.id ?? dept.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative overflow-hidden rounded-lg border ${colors.border} ${colors.bg} p-3.5 border-l-2 ${colors.left} transition-all duration-200 hover:bg-background/40 hover:shadow-[0_0_25px_-8px_hsl(var(--primary)/0.06)]`}
                >
                  <motion.div
                    className="pointer-events-none absolute -right-4 -top-4 h-10 w-10 rounded-full border border-current opacity-[0.04]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="relative z-[1]">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md ${colors.bg}`}>
                          <Building2 className={`h-3 w-3 ${colors.text}`} />
                        </div>
                        <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${colors.text}`}>
                          {dept.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                        <span className="text-[10px] font-mono text-muted-foreground/40">
                          {dept.head_count} roles
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(dept.roles ?? []).slice(0, 8).map((role) => {
                        const colorClass = roleColors[role.status] ?? roleColors.proposed;
                        return (
                          <motion.span
                            key={role.id ?? role.title}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-all hover:scale-105",
                              colorClass
                            )}
                          >
                            <PulseRing
                              active={role.status === "running"}
                              color={role.status === "running" ? "hsl(var(--primary))" : role.status === "active" ? "hsl(var(--success))" : "hsl(var(--muted-foreground))"}
                              size={3}
                            />
                            {role.title}
                          </motion.span>
                        );
                      })}
                      {(dept.roles?.length ?? 0) > 8 && (
                        <span className="inline-flex items-center px-2 text-[10px] text-muted-foreground/30">
                          +{dept.roles!.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {departments.length > 4 && (
              <p className="text-center text-[10px] text-muted-foreground/30 pt-1">
                +{departments.length - 4} more departments — <Link href="/organization" className="underline underline-offset-2 hover:text-foreground/50">View all</Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
