"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useEventsQuery, useTelemetryQuery, useTelemetrySummaryQuery, useObjectivesQuery } from "@/hooks/use-api";
import { StatusBadge } from "@/components/status-badge";
import { ArrowRightLeft, Clock, Cpu, DollarSign, Activity, AlertTriangle } from "lucide-react";

export default function DiffPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
      <DiffContent />
    </Suspense>
  );
}

function DiffContent() {
  const searchParams = useSearchParams();
  const id1 = searchParams.get("id1");
  const id2 = searchParams.get("id2");

  const { data: objectives } = useObjectivesQuery();

  const { data: events1 } = useEventsQuery(id1);
  const { data: events2 } = useEventsQuery(id2);
  const { data: telemetry1 } = useTelemetryQuery(id1);
  const { data: telemetry2 } = useTelemetryQuery(id2);
  const { data: summary1 } = useTelemetrySummaryQuery(id1);
  const { data: summary2 } = useTelemetrySummaryQuery(id2);

  const [selectedSection, setSelectedSection] = useState<string>("overview");

  const obj1 = useMemo(
    () => objectives?.find((o) => o.id === id1),
    [objectives, id1],
  );
  const obj2 = useMemo(
    () => objectives?.find((o) => o.id === id2),
    [objectives, id2],
  );

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "events", label: "Events" },
    { id: "telemetry", label: "Telemetry" },
  ];

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Execution Diff</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Side-by-side comparison of two execution runs
        </p>
      </motion.div>

      {(!id1 || !id2) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Provide two objective IDs via <code className="text-xs font-mono bg-muted/30 px-1.5 py-0.5 rounded">?id1=...&amp;id2=...</code> to compare runs.
          </p>
        </motion.div>
      )}

      {id1 && id2 && (
        <>
          {/* Run selector tabs */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="font-mono truncate max-w-[120px]">{obj1?.raw_input?.slice(0, 40) ?? id1.slice(0, 8)}</span>
            <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono truncate max-w-[120px]">{obj2?.raw_input?.slice(0, 40) ?? id2.slice(0, 8)}</span>
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-card p-1 w-fit">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSection(s.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[11px] font-medium transition-all",
                  selectedSection === s.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {selectedSection === "overview" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <RunSidebar
                label="Run A"
                objectiveId={id1}
                objectiveSummary={obj1?.raw_input ?? null}
                status={obj1?.status ?? null}
                summary={summary1}
              />
              <RunSidebar
                label="Run B"
                objectiveId={id2}
                objectiveSummary={obj2?.raw_input ?? null}
                status={obj2?.status ?? null}
                summary={summary2}
              />
            </div>
          )}

          {selectedSection === "events" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <EventColumn label="Run A Events" events={events1 ?? []} />
              <EventColumn label="Run B Events" events={events2 ?? []} />
            </div>
          )}

          {selectedSection === "telemetry" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <TelemetryColumn label="Run A Telemetry" telemetry={telemetry1 ?? []} />
              <TelemetryColumn label="Run B Telemetry" telemetry={telemetry2 ?? []} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RunSidebar({
  label,
  objectiveId,
  objectiveSummary,
  status,
  summary,
}: {
  label: string;
  objectiveId: string;
  objectiveSummary: string | null;
  status: string | null;
  summary: {
    total_agents: number;
    completed: number;
    failed: number;
    total_cost: number;
    total_tokens: number;
    total_runtime_ms: number;
  } | null | undefined;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/50 bg-card"
    >
      <div className="border-b border-border/30 px-4 py-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold">{label}</h3>
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {objectiveId.slice(0, 8)}&hellip;
        </span>
      </div>
      <div className="p-4 space-y-3">
        {objectiveSummary && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {objectiveSummary}
          </p>
        )}
        {status && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Status:</span>
            <StatusBadge status={status} size="sm" />
          </div>
        )}
        {summary ? (
          <div className="grid grid-cols-2 gap-2">
            <DiffChip icon={Activity} label="Agents" value={summary.total_agents} />
            <DiffChip icon={Clock} label="Runtime" value={`${(summary.total_runtime_ms / 1000).toFixed(1)}s`} />
            <DiffChip icon={Cpu} label="Tokens" value={summary.total_tokens.toLocaleString()} />
            <DiffChip icon={DollarSign} label="Cost" value={`${summary.total_cost.toFixed(6)}`} />
            <DiffChip icon={Activity} label="Completed" value={summary.completed} color="text-emerald-400" />
            <DiffChip icon={AlertTriangle} label="Failed" value={summary.failed} color={summary.failed > 0 ? "text-red-400" : "text-muted-foreground"} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60">No telemetry data</p>
        )}
      </div>
    </motion.div>
  );
}

function EventColumn({
  label,
  events,
}: {
  label: string;
  events: Array<{ id: string; stage: string; status: string; message: string | null; created_at: string | null }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/50 bg-card"
    >
      <div className="border-b border-border/30 px-4 py-3">
        <h3 className="text-xs font-semibold">{label}</h3>
      </div>
      <div className="max-h-[500px] overflow-y-auto scrollbar-thin divide-y divide-border/20">
        {events.length === 0 && (
          <div className="p-4 text-xs text-muted-foreground">No events</div>
        )}
        {events.map((e) => (
          <div key={e.id} className="px-4 py-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-foreground/80">
                {e.stage}
              </span>
              <StatusBadge status={e.status} size="sm" />
            </div>
            {e.message && (
              <p className="text-[10px] text-muted-foreground/70 line-clamp-2">
                {e.message}
              </p>
            )}
            {e.created_at && (
              <span className="font-mono text-[9px] tabular-nums text-muted-foreground/40">
                {new Date(e.created_at).toLocaleTimeString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TelemetryColumn({
  label,
  telemetry,
}: {
  label: string;
  telemetry: Array<{
    id: string;
    agent_name: string | null;
    agent_id: string;
    stage: string;
    status: string;
    model: string | null;
    total_tokens: number | null;
    total_cost: number | null;
    runtime_ms: number | null;
    retries: number;
    error: string | null;
  }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/50 bg-card"
    >
      <div className="border-b border-border/30 px-4 py-3">
        <h3 className="text-xs font-semibold">{label}</h3>
      </div>
      <div className="max-h-[500px] overflow-y-auto scrollbar-thin divide-y divide-border/20">
        {telemetry.length === 0 && (
          <div className="p-4 text-xs text-muted-foreground">No telemetry</div>
        )}
        {telemetry.map((t) => (
          <div key={t.id} className="px-4 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80">
                {t.agent_name ?? t.agent_id}
              </span>
              <StatusBadge status={t.status} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
              <span>{t.stage}</span>
              {t.model && <span>{t.model}</span>}
              {t.runtime_ms != null && <span>{(t.runtime_ms / 1000).toFixed(1)}s</span>}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
              {t.total_tokens != null && <span>Tokens: {t.total_tokens.toLocaleString()}</span>}
              {t.total_cost != null && <span>Cost: ${t.total_cost.toFixed(6)}</span>}
              {t.retries > 0 && <span>Retries: {t.retries}</span>}
            </div>
            {t.error && (
              <div className="rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
                {t.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function DiffChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-border/30 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <span className={cn("font-mono text-xs font-medium tabular-nums text-foreground/80", color)}>
        {value}
      </span>
    </div>
  );
}
