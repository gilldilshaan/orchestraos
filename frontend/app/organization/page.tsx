"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useLatestObjectiveIdQuery, useOrganizationQuery, useEventsQuery, useTelemetryQuery, useDecisionsQuery } from "@/hooks/use-api";
import { useObjectiveContextStore } from "@/store";
import type { ApiRole, ApiDepartment } from "@/hooks/use-api";
import { OrganizationUniverse } from "@/components/3d/scene-wrapper";
import { PremiumCard } from "@/components/premium/premium-card";
import { PulseRing } from "@/components/premium/page-transition";
import { PageSkeleton } from "@/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { X, Target, Users, ListChecks, Wrench, Activity, Cpu, GitBranch, MessageSquare, Building2, ChevronRight, Crown } from "lucide-react";

interface RoleDetail {
  role: ApiRole;
  department: ApiDepartment;
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrganizationContent />
    </Suspense>
  );
}

function OrganizationContent() {
  const searchParams = useSearchParams();
  const { setActiveObjectiveId } = useObjectiveContextStore();
  const urlId = searchParams.get("id");
  const { data: latestObjectiveId } = useLatestObjectiveIdQuery(!urlId);
  const objectiveId = urlId ?? latestObjectiveId;
  const { data: org } = useOrganizationQuery(objectiveId);
  const { data: events } = useEventsQuery(objectiveId);
  const { data: telemetry } = useTelemetryQuery(objectiveId);
  const { data: decisions } = useDecisionsQuery(objectiveId);

  useEffect(() => {
    if (urlId) {
      setActiveObjectiveId(urlId);
    }
  }, [urlId, setActiveObjectiveId]);

  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);

  const departments = useMemo(() => org?.departments ?? [], [org]);

  const closeModal = useCallback(() => setSelectedRole(null), []);

  const roleTelemetry = useMemo(() => {
    if (!selectedRole || !telemetry) return [];
    const { role, department } = selectedRole;
    const matches = telemetry.filter(
      (t) =>
        t.agent_name === role.title ||
        t.agent_id === role.id ||
        t.role === role.title ||
        t.department === department.name
    );
    if (matches.length > 0) return matches;
    return [...telemetry]
      .sort((a, b) => (b.start_time ?? "").localeCompare(a.start_time ?? ""))
      .slice(0, 8);
  }, [selectedRole, telemetry]);

  const telemetryIsFallback = useMemo(() => {
    if (!selectedRole || !telemetry) return false;
    const { role, department } = selectedRole;
    return !telemetry.some(
      (t) =>
        t.agent_name === role.title ||
        t.agent_id === role.id ||
        t.role === role.title ||
        t.department === department.name
    );
  }, [selectedRole, telemetry]);

  const roleEvents = useMemo(() => {
    if (!selectedRole || !events) return [];
    const stages = new Set(roleTelemetry.map((t) => t.stage).filter(Boolean));
    if (stages.size === 0) return [];
    return events.filter((e) => stages.has(e.stage));
  }, [roleTelemetry, events]);

  const roleDecisions = useMemo(() => {
    if (!selectedRole || !decisions) return [];
    const role = selectedRole.role.title.toLowerCase();
    return [...decisions].sort((a, b) => {
      const aMatch = a.title.toLowerCase().includes(role) ? 1 : 0;
      const bMatch = b.title.toLowerCase().includes(role) ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [selectedRole, decisions]);

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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <PageHeader
          kicker="Explore"
          title="Organization Explorer"
          description="Hierarchical view of the dynamically generated AI organization"
        />
      </motion.div>

      {!departments.length ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No organization data yet"
            description="Run a pipeline to generate an organization structure."
          />
        </motion.div>
      ) : (
        <>
          {/* 3D Universe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="h-[400px] overflow-hidden rounded-xl border border-border/30 bg-card/20"
          >
            <OrganizationUniverse
              nodes={universeNodes}
              isExecuting
              className="h-full w-full"
            />
          </motion.div>

          {/* Organization Structure */}
          <div className="space-y-5">
            {departments.map((dept, gi) => (
              <motion.div
                key={dept.id ?? dept.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + gi * 0.08 }}
                className="panel"
              >
                {/* Department header */}
                <div className="flex items-center justify-between border-b border-border/20 px-5 py-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground/80">{dept.name}</h3>
                      <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary/60 border border-primary/10">
                        {(dept.roles ?? []).length} roles
                      </span>
                    </div>
                    {dept.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground/50">{dept.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20" />
                </div>

                {/* Roles: department lead stands out, staff arranged below */}
                {(() => {
                  const roles = dept.roles ?? [];
                  const sorted = [...roles].sort(
                    (a, b) => (a.hiring_order ?? 0) - (b.hiring_order ?? 0)
                  );
                  const lead = sorted[0];
                  const staff = sorted.slice(1);
                  return (
                    <div className="space-y-3 p-4">
                      {lead && (
                        <MemberCard
                          key={lead.id ?? lead.title}
                          role={lead}
                          department={dept}
                          isLead={staff.length > 0}
                          onClick={() => setSelectedRole({ role: lead, department: dept })}
                        />
                      )}
                      {staff.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {staff.map((role) => (
                            <MemberCard
                              key={role.id ?? role.title}
                              role={role}
                              department={dept}
                              onClick={() => setSelectedRole({ role, department: dept })}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Role Detail Modal */}
      <RoleDetailModal
        detail={selectedRole}
        telemetry={roleTelemetry}
        telemetryFallback={telemetryIsFallback}
        events={roleEvents}
        decisions={roleDecisions}
        onClose={closeModal}
      />
    </div>
  );
}

function MemberCard({ role, department, isLead, onClick }: { role: ApiRole; department: ApiDepartment; isLead?: boolean; onClick: () => void }) {
  const isActive = role.status === "active";
  const isRunning = role.status === "running";
  const statusColor = isActive
    ? "bg-success/8 text-success/70 border-success/15"
    : isRunning
      ? "bg-primary/8 text-primary/70 border-primary/15"
      : "bg-muted/10 text-muted-foreground/40 border-border/20";

  return (
    <PremiumCard
      variant={isLead ? "bordered" : "glass"}
      hoverEffect="lift"
      className={cn("text-left", isLead ? "border-primary/25 bg-primary/[0.03] p-5" : "p-4")}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isLead && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Crown className="h-3.5 w-3.5" />
            </span>
          )}
          <span className={cn("font-medium text-foreground/80 truncate", isLead ? "text-base" : "text-sm")}>
            {role.title}
          </span>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium", statusColor)}>
          <PulseRing
            active={isRunning}
            color={isRunning ? "hsl(var(--primary))" : isActive ? "hsl(var(--success))" : "hsl(var(--muted-foreground))"}
            size={5}
          />
          {role.status.charAt(0).toUpperCase() + role.status.slice(1)}
        </span>
      </div>
      {isLead && (
        <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-primary/70">
          Department Lead
        </span>
      )}
      {role.description && (
        <p className={cn("mt-1.5 text-muted-foreground/50", isLead ? "text-xs line-clamp-2" : "text-xs line-clamp-1")}>
          {role.description}
        </p>
      )}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground/30">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {role.head_count ?? 1}
        </span>
        <span>{department.name}</span>
      </div>
    </PremiumCard>
  );
}

function Section({ icon: Icon, title, color, children }: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground/40">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function RoleDetailModal({ detail, telemetry, telemetryFallback, events, decisions, onClose }: {
  detail: RoleDetail | null;
  telemetry: ReturnType<typeof useTelemetryQuery>["data"];
  telemetryFallback: boolean;
  events: ReturnType<typeof useEventsQuery>["data"];
  decisions: ReturnType<typeof useDecisionsQuery>["data"];
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {detail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-xl border border-border/30 bg-card/95 backdrop-blur-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border/20 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground/90">{detail.role.title}</h2>
                <p className="text-xs text-muted-foreground/50 mt-0.5">{detail.department.name}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground/40 hover:text-foreground/60 hover:bg-muted/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-5 scrollbar-thin">
              <Section icon={Activity} title="Status" color="text-emerald-400/70">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  detail.role.status === "active" ? "bg-success/8 text-success/70 border-success/15" : "bg-muted/10 text-muted-foreground/50 border-border/20"
                }`}>
                  {detail.role.status}
                </span>
              </Section>

              {detail.role.description && (
                <Section icon={Target} title="Description" color="text-blue-400/70">
                  <p className="text-sm text-muted-foreground/60 leading-relaxed">{detail.role.description}</p>
                </Section>
              )}

              {detail.role.responsibilities && detail.role.responsibilities.length > 0 && (
                <Section icon={ListChecks} title="Responsibilities" color="text-violet-400/70">
                  <ul className="space-y-1.5">
                    {detail.role.responsibilities.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground/60">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/40" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {detail.role.required_skills && detail.role.required_skills.length > 0 && (
                <Section icon={Wrench} title="Required Skills" color="text-amber-400/70">
                  <div className="flex flex-wrap gap-1.5">
                    {detail.role.required_skills.map((s, i) => (
                      <span key={i} className="rounded-md bg-amber-500/8 px-2 py-0.5 text-xs text-amber-400/70 border border-amber-500/10">
                        {s}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              <Section icon={Cpu} title="Telemetry" color="text-cyan-400/70">
                {telemetry && telemetry.length > 0 ? (
                  <div className="space-y-1.5">
                    {telemetry.slice(0, 5).map((t) => (
                      <div key={t.id} className="rounded-md bg-muted/15 px-3 py-2 border border-border/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground/70">{t.stage}</span>
                          <span className={`text-[10px] ${t.status === "completed" ? "text-emerald-400/70" : t.status === "failed" ? "text-red-400/70" : "text-muted-foreground/50"}`}>
                            {t.status}
                          </span>
                        </div>
                        {t.runtime_ms != null && (
                          <span className="text-[10px] text-muted-foreground/40">{t.runtime_ms.toFixed(0)}ms</span>
                        )}
                        {t.model && <span className="ml-2 text-[10px] text-muted-foreground/40">{t.model}</span>}
                      </div>
                    ))}
                    {telemetry.length > 5 && (
                      <p className="text-[10px] text-muted-foreground/30">+{telemetry.length - 5} more entries</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">No telemetry records found for this role</p>
                )}
                {telemetryFallback && telemetry && telemetry.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/30 mt-1">
                    Roles are design-time &mdash; showing pipeline-level activity instead
                  </p>
                )}
              </Section>

              <Section icon={GitBranch} title="Artifacts" color="text-rose-400/70">
                {events && events.length > 0 ? (
                  <div className="space-y-1.5">
                    {events.slice(0, 5).map((e) => (
                      <div key={e.id} className="rounded-md bg-muted/15 px-3 py-2 flex items-center justify-between border border-border/10">
                        <span className="text-xs text-foreground/60">{e.stage}</span>
                        <span className={`text-[10px] ${e.status === "completed" ? "text-emerald-400/70" : e.status === "failed" ? "text-red-400/70" : "text-muted-foreground/50"}`}>
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">No artifacts produced yet</p>
                )}
              </Section>

              <Section icon={MessageSquare} title="Decisions" color="text-indigo-400/70">
                {decisions && decisions.length > 0 ? (
                  <div className="space-y-1.5">
                    {decisions.slice(0, 5).map((d) => (
                      <div key={d.id} className="rounded-md bg-muted/15 px-3 py-2 border border-border/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground/70">{d.title}</span>
                          {d.confidence != null && (
                            <span className="text-[10px] text-muted-foreground/40">{(d.confidence * 100).toFixed(0)}%</span>
                          )}
                        </div>
                        {d.recommendation && (
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5 line-clamp-1">{d.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">No decisions linked to this role</p>
                )}
              </Section>
            </div>

            <div className="border-t border-border/20 px-5 py-3">
              <p className="text-[10px] text-muted-foreground/30 text-center">
                Role ID: {detail.role.id} &middot; Department ID: {detail.department.id}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
