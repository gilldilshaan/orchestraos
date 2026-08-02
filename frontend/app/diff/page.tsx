"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useEventsQuery, useTelemetryQuery, useTelemetrySummaryQuery, useObjectivesQuery } from "@/hooks/use-api";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/skeleton";
import { SegmentedControl } from "@/components/segmented-control";
import { ArrowRightLeft, Clock, Cpu, DollarSign, Activity, AlertTriangle, Search } from "lucide-react";
import { PipelineReport } from "@/app/execution/components/pipeline-report";

export default function DiffPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DiffContent />
    </Suspense>
  );
}

function DiffContent() {
  const router = useRouter();
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
  const [selectedA, setSelectedA] = useState(id1 ?? "");
  const [selectedB, setSelectedB] = useState(id2 ?? "");

  const obj1 = useMemo(
    () => objectives?.find((o) => o.id === selectedA),
    [objectives, selectedA],
  );
  const obj2 = useMemo(
    () => objectives?.find((o) => o.id === selectedB),
    [objectives, selectedB],
  );

  const handleCompare = () => {
    if (selectedA && selectedB) {
      router.push(`/diff?id1=${selectedA}&id2=${selectedB}`);
    }
  };

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "events", label: "Events" },
    { id: "telemetry", label: "Telemetry" },
  ];

  const runs = useMemo(() => {
    return (objectives ?? []).map((o) => ({
      id: o.id,
      label: `${o.raw_input?.slice(0, 50) ?? "Unknown"} (${o.id.slice(0, 8)}...)`,
    }));
  }, [objectives]);

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Analyze"
        title="Execution Diff"
        description="Side-by-side comparison of two execution runs"
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-lg border border-border/50 bg-card p-4"
      >
        <div className="flex-1">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Execution A
          </label>
          <select
            value={selectedA}
            onChange={(e) => setSelectedA(e.target.value)}
            className="input"
          >
            <option value="">Select execution...</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center pb-2">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Execution B
          </label>
          <select
            value={selectedB}
            onChange={(e) => setSelectedB(e.target.value)}
            className="input"
          >
            <option value="">Select execution...</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCompare}
          disabled={!selectedA || !selectedB}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-[11px] font-medium text-primary transition-all hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-40"
        >
          <Search className="h-3.5 w-3.5" />
          Compare
        </button>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border/40 bg-card/30 p-3.5">
          <div className="section-kicker">Available Executions</div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground/80">{runs.length}</div>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/30 p-3.5">
          <div className="section-kicker">Completed</div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-400/90">
            {objectives?.filter((o) => o.status === "completed").length ?? 0}
          </div>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/30 p-3.5">
          <div className="section-kicker">Running</div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-primary/90">
            {objectives?.filter((o) => o.status === "running" || o.status === "queued").length ?? 0}
          </div>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/30 p-3.5">
          <div className="section-kicker">Failed</div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-red-400/90">
            {objectives?.filter((o) => o.status === "failed" || o.status === "error").length ?? 0}
          </div>
        </div>
      </div>

      {!id1 || !id2 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EmptyState
            icon={<ArrowRightLeft className="h-5 w-5" />}
            title="Select two executions"
            description="Pick two runs from the dropdowns above and click Compare."
          />
        </motion.div>
      ) : null}

      {id1 && id2 && (
        <>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="chip font-mono max-w-[160px] truncate">{obj1?.raw_input?.slice(0, 40) ?? id1.slice(0, 8)}</span>
            <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="chip font-mono max-w-[160px] truncate">{obj2?.raw_input?.slice(0, 40) ?? id2.slice(0, 8)}</span>
          </div>

          <SegmentedControl
            value={selectedSection}
            onChange={setSelectedSection}
            options={sections.map((s) => ({ value: s.id, label: s.label }))}
          />

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
          <EmptyState
            compact
            icon={<Activity className="h-5 w-5" />}
            title="No telemetry data"
            description="This run has no telemetry summary yet."
          />
        )}
        <PipelineReport objectiveId={objectiveId} />
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
          <EmptyState
            compact
            icon={<Activity className="h-5 w-5" />}
            title="No events"
            description="No execution events recorded for this run."
          />
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
          <EmptyState
            compact
            icon={<Cpu className="h-5 w-5" />}
            title="No telemetry"
            description="No agent telemetry recorded for this run."
          />
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
