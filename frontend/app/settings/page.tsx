"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useThemeStore } from "@/store";
import { useHealthAiQuery } from "@/hooks/use-api";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { PulseRing } from "@/components/premium/page-transition";
import { Moon, Sun, Monitor, Palette, Info, Server, Cpu, Zap, Coins } from "lucide-react";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { mode, setMode } = useThemeStore();
  const [displayName, setDisplayName] = useState("");
  const { data: ai } = useHealthAiQuery();

  const kernelStats = [
    { label: "Kernel Calls", value: ai?.kernel.total_calls ?? 0, icon: Cpu, tone: "hsl(263 72% 62%)" },
    { label: "Tokens Used", value: ai?.kernel.tokens_used ?? 0, icon: Server, tone: "hsl(199 72% 52%)" },
    { label: "Cache Hit Rate", value: ai?.kernel.cache_hit_rate != null ? `${Math.round(ai.kernel.cache_hit_rate * 100)}%` : "—", icon: Zap, tone: "hsl(158 62% 42%)" },
    { label: "Total Cost", value: ai?.kernel.total_cost != null ? `$${Number(ai.kernel.total_cost).toFixed(2)}` : "—", icon: Coins, tone: "hsl(38 88% 52%)" },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        kicker="System"
        title="Settings"
        description="Application preferences"
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bento-tile p-5"
      >
        <SectionHeader
          title="Appearance"
          description="Theme preference, stored locally on this device"
        />
        <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-border/30 bg-muted/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Palette className="h-3.5 w-3.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/90">Theme</label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose how OrchestraOS looks on this device
              </p>
            </div>
          </div>
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={THEME_OPTIONS.map(({ value, label, icon: Icon }) => ({
              value,
              label,
              icon: <Icon className="h-3.5 w-3.5" />,
            }))}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bento-tile p-5"
      >
        <SectionHeader
          title="Workspace"
          description="Display preferences for this dashboard"
        />
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground/80">
              Workspace display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="OrchestraOS"
              className="input"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground/50">
              Stored locally on this device. No data leaves your browser.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="bento-tile-accent relative overflow-hidden p-5"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            title="System Status"
            description="Live health of the backend runtime"
          />
          <div className="flex items-center gap-2">
            <span className="chip">
              {ai?.active_runs ?? 0} active runs · queue {ai?.queue_depth ?? 0}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                ai?.status === "healthy"
                  ? "border-success/20 bg-success/8 text-success"
                  : "border-warning/20 bg-warning/8 text-warning"
              }`}
            >
              <PulseRing active={ai?.status === "healthy"} color={ai?.status === "healthy" ? "hsl(var(--success))" : "hsl(var(--warning))"} size={5} />
              {ai?.status ?? "unknown"}
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kernelStats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border/15 bg-background/30 p-3">
              <div className="flex items-center gap-1.5">
                <s.icon className="h-3 w-3" style={{ color: s.tone }} />
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
                  {s.label}
                </span>
              </div>
              <div className="mt-1.5 font-mono text-base font-semibold tabular-nums text-foreground/85">
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground/40">
          <span>{ai?.provider ?? "—"} · {ai?.model ?? "—"}</span>
          <span>Uptime: {Math.floor((ai?.uptime_seconds ?? 0) / 3600)}h {Math.floor(((ai?.uptime_seconds ?? 0) % 3600) / 60)}m</span>
          <span>{ai?.active_agents ?? 0} agents online</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bento-tile p-5"
      >
        <SectionHeader
          title="Advanced"
          description="Provider, execution, and telemetry configuration"
        />
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border/30 bg-muted/10 p-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Provider configuration, execution policies, and telemetry settings are not yet available. They will be exposed once the settings persistence backend is implemented.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
