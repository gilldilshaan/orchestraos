"use client";

import { motion } from "motion/react";
import { useThemeStore } from "@/store";

export default function SettingsPage() {
  const { mode, setMode } = useThemeStore();

  return (
    <div className="space-y-6">
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
        <div className="border-b border-border/50 px-5 py-3.5">
          <h3 className="text-sm font-medium">Appearance</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Theme preference (stored locally)
          </p>
        </div>
        <div className="divide-y divide-border/50">
          <div className="flex items-center justify-between px-5 py-3">
            <label className="text-sm text-muted-foreground">Theme</label>
            <div className="flex gap-1">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMode(t)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    mode === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-xl border border-border/50 bg-card p-8 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Provider configuration, execution policies, and telemetry settings are not yet available. They will be exposed once the settings persistence backend is implemented.
        </p>
      </motion.div>
    </div>
  );
}
