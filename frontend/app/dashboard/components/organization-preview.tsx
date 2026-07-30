"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useObjectiveContextStore } from "@/store";
import { useLatestObjectiveIdQuery, useOrganizationQuery } from "@/hooks/use-api";
import { ArrowRight, Building2 } from "lucide-react";
import { PulseRing } from "@/components/premium/page-transition";

const roleColors: Record<string, string> = {
  active: "border-success/15 bg-success/8 text-success/70 border-success/15",
  running: "border-primary/15 bg-primary/8 text-primary/70 border-primary/15",
  proposed: "border-border/20 bg-muted/10 text-muted-foreground/40 border-border/20",
};

export function OrganizationPreview() {
  const activeObjectiveId = useObjectiveContextStore((s) => s.activeObjectiveId);
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!activeObjectiveId);
  const objectiveId = activeObjectiveId ?? latestObjectiveId;
  const { data: org } = useOrganizationQuery(objectiveId);

  const departments = org?.departments ?? [];
  const totalHeadCount = org?.total_head_count ?? 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="enterprise-panel p-5"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground/50" />
            <h2 className="text-sm font-semibold text-foreground/80">Organization</h2>
          </div>
          <Link
            href="/organization"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground/40 transition-colors hover:text-foreground/60"
          >
            Open Explorer
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {departments.length === 0 ? (
          <p className="text-sm text-muted-foreground/50">No organization data yet. Run a pipeline to generate one.</p>
        ) : (
          <div className="space-y-4">
            {departments.slice(0, 3).map((dept) => (
              <div key={dept.id ?? dept.name}>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
                  {dept.name}
                  <span className="normal-case text-muted-foreground/30 text-[10px]">
                    {dept.head_count} roles
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dept.roles?.slice(0, 6).map((role) => {
                    const colorClass = roleColors[role.status] ?? roleColors.proposed;
                    return (
                      <motion.div
                        key={role.id ?? role.title}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.05 }}
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
                      </motion.div>
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
    </motion.section>
  );
}
