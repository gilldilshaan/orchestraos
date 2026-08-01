"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useObjectiveContextStore } from "@/store";
import { useLatestObjectiveIdQuery, useOrganizationQuery } from "@/hooks/use-api";
import { ArrowRight, Building2 } from "lucide-react";
import { PulseRing } from "@/components/premium/page-transition";
import { EmptyState } from "./empty-state";

const roleColors: Record<string, string> = {
  active: "border-success/15 bg-success/8 text-success",
  running: "border-primary/15 bg-primary/8 text-primary",
  proposed: "border-border/20 bg-muted/10 text-muted-foreground/50",
};

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
          <EmptyState
            icon={<Building2 className="h-4 w-4" />}
            title="No organization generated"
            description="Run a pipeline to design departments, executives and specialist roles for your objective."
            hint="depts ┬╖ roles ┬╖ headcount"
          />
        ) : (
          <div className="space-y-4">
            {departments.slice(0, 3).map((dept) => (
              <div key={dept.id ?? dept.name}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/40">
                    {dept.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/30">
                    {dept.head_count} roles
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dept.roles?.slice(0, 6).map((role) => {
                    const colorClass = roleColors[role.status] ?? roleColors.proposed;
                    return (
                      <motion.span
                        key={role.id ?? role.title}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-all",
                          colorClass
                        )}
                      >
                        <PulseRing
                          active={role.status === "running"}
                          color={role.status === "running" ? "hsl(var(--primary))" : role.status === "active" ? "hsl(var(--success))" : "hsl(var(--muted-foreground))"}
                          size={4}
                        />
                        {role.title}
                      </motion.span>
                    );
                  })}
                  {(dept.roles?.length ?? 0) > 6 && (
                    <span className="inline-flex items-center px-2 text-[10px] text-muted-foreground/30">
                      +{dept.roles!.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            ))}
            {departments.length > 3 && (
              <p className="text-[10px] text-muted-foreground/30">
                +{departments.length - 3} more departments
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
