"use client";

import { motion } from "motion/react";

const settingsSections = [
  {
    title: "Providers",
    description: "Configure AI provider connections and API keys",
    fields: [
      { label: "Primary Provider", value: "OpenAI", type: "select" },
      { label: "Model", value: "gpt-4o", type: "select" },
      { label: "Temperature", value: "0.3", type: "range" },
    ],
  },
  {
    title: "Execution",
    description: "Set concurrency limits and retry policies",
    fields: [
      { label: "Max Concurrency", value: "8", type: "number" },
      { label: "Max Retries", value: "3", type: "number" },
      { label: "Backoff Strategy", value: "Exponential", type: "select" },
    ],
  },
  {
    title: "Telemetry",
    description: "Configure observability and event tracking",
    fields: [
      { label: "Telemetry Enabled", value: "true", type: "toggle" },
      { label: "Event Retention", value: "7 days", type: "select" },
      { label: "Log Level", value: "INFO", type: "select" },
    ],
  },
  {
    title: "Appearance",
    description: "Theme and display preferences",
    fields: [
      { label: "Theme", value: "Dark", type: "select" },
      { label: "Font Size", value: "Medium", type: "select" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure system preferences and provider connections
        </p>
      </motion.div>

      <div className="space-y-4">
        {settingsSections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + si * 0.05 }}
            className="rounded-lg border border-border/50 bg-card"
          >
            <div className="border-b border-border/50 px-5 py-3.5">
              <h3 className="text-sm font-medium">{section.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {section.description}
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {section.fields.map((field) => (
                <div
                  key={field.label}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <label className="text-sm text-muted-foreground">
                    {field.label}
                  </label>
                  {field.type === "toggle" ? (
                    <div className="flex h-5 w-9 cursor-pointer items-center rounded-full bg-primary/30 p-0.5 transition-colors hover:bg-primary/40">
                      <div className="h-4 w-4 translate-x-4 rounded-full bg-primary shadow-sm transition-transform" />
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-foreground/80">
                      {field.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
