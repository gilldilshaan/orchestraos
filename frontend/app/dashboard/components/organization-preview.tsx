"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLatestObjectiveIdQuery, useOrganizationQuery } from "@/hooks/use-api";

const levelColors = [
  "border-primary/30 bg-primary/5 text-primary",
  "border-blue-400/20 bg-blue-400/5 text-blue-400",
  "border-emerald-400/20 bg-emerald-400/5 text-emerald-400",
];

const levelLabels = ["Leader", "Departments", "Roles"];

export function OrganizationPreview() {
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery();
  const { data: org } = useOrganizationQuery(latestObjectiveId);

  const departments = org?.departments ?? [];
  const totalHeadCount = org?.total_head_count ?? 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border/80"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Organization</h2>
          <Link
            href="/organization"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Open Explorer →
          </Link>
        </div>

        {departments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No organization data yet. Run a pipeline to generate one.
          </p>
        ) : (
          <div className="space-y-4">
            {departments.map((dept) => (
              <div key={dept.id ?? dept.name}>
                <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {dept.name}
                  <span className="ml-2 normal-case text-muted-foreground/50">
                    {dept.head_count} roles
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dept.roles?.map((role) => (
                    <motion.div
                      key={role.id ?? role.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ scale: 1.05 }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                        role.status === "active" ? levelColors[2] : levelColors[0]
                      )}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          role.status === "active" ? "bg-success" : "bg-muted-foreground/30"
                        }`}
                      />
                      {role.title}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
