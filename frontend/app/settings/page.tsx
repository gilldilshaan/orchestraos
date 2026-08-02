"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useThemeStore } from "@/store";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Moon, Sun, Monitor, Palette, Info } from "lucide-react";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { mode, setMode } = useThemeStore();
  const [displayName, setDisplayName] = useState("");

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
