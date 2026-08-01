"use client";

import { motion } from "motion/react";
import { useThemeStore } from "@/store";
import { Moon, Sun, Monitor, Palette, Info } from "lucide-react";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { mode, setMode } = useThemeStore();

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Application preferences
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-lg border border-border/50 bg-card"
      >
        <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Palette className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Appearance</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Theme preference, stored locally on this device
            </p>
          </div>
        </div>
        <div className="divide-y divide-border/50">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <label className="text-sm font-medium text-foreground/90">Theme</label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose how OrchestraOS looks on this device
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/20 p-1">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    mode === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

<<<<<<< HEAD
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-lg border border-border/50 bg-card"
      >
        <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Advanced</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Provider, execution, and telemetry configuration
            </p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Provider configuration, execution policies, and telemetry settings are not yet available. They will be exposed once the settings persistence backend is implemented.
          </p>
        </div>
      </motion.div>

    </div>
  );
}
