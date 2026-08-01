"use client";

import { motion } from "motion/react";
import { useHealthAiQuery } from "@/hooks/use-api";
import { AnimatedCounter } from "@/components/animated-counter";
import { Cpu, Coins, DatabaseZap, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function StatTile({
  icon,
  label,
  value,
  format = "number",
  suffix,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  format?: "number" | "percent" | "decimal";
  suffix?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-lg border border-border/20 bg-background/30 px-3 py-2.5 transition-colors hover:border-primary/30"
    >
      <div className="pointer-events-none absolute -right-3 -top-5 h-12 w-12 rounded-full bg-primary/10 blur-xl" />
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
        <span className="text-primary/60">{icon}</span>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        {value != null ? (
          <AnimatedCounter value={value} format={format} className="font-mono text-sm font-semibold tabular-nums text-foreground/85" />
        ) : (
          <span className="font-mono text-sm text-muted-foreground/30">\u2014</span>
        )}
        {suffix && <span className="font-mono text-[10px] text-muted-foreground/40">{suffix}</span>}
      </div>
    </motion.div>
  );
}

export function KernelMonitor() {
  const { data: ai } = useHealthAiQuery();
  const kernel = ai?.kernel;
  const cacheRate = kernel?.cache_hit_rate ?? 0;

  const agents = [
    { label: "Agents", value: ai?.active_agents ?? 0, color: "hsl(var(--primary))" },
    { label: "Executives", value: ai?.active_executives ?? 0, color: "hsl(271 91% 65%)" },
    { label: "Specialists", value: ai?.active_specialists ?? 0, color: "hsl(190 91% 60%)" },
  ];
  const maxAgents = Math.max(...agents.map((a) => a.value), 1);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Cpu className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="panel-header-title">AI Kernel</span>
        </div>
        <span className="flex items-center gap-1.5">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-success"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="font-mono text-[10px] text-muted-foreground/40">{ai?.provider ?? "\u2014"}</span>
        </span>
      </div>
      <div className="panel-body space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={<Zap className="h-3 w-3" />}
            label="Calls"
            value={kernel?.total_calls ?? null}
            delay={0.05}
          />
          <StatTile
            icon={<DatabaseZap className="h-3 w-3" />}
            label="Cache Hit"
            value={cacheRate != null ? cacheRate * 100 : null}
            format="percent"
            delay={0.1}
          />
          <StatTile
            icon={<Coins className="h-3 w-3" />}
            label="Cost"
            value={kernel?.total_cost != null ? Number(kernel.total_cost.toFixed(2)) : null}
            format="decimal"
            suffix="$"
            delay={0.15}
          />
          <StatTile
            icon={<DatabaseZap className="h-3 w-3" />}
            label="Tokens"
            value={kernel?.tokens_used ?? null}
            delay={0.2}
          />
        </div>

        <div className="rounded-lg border border-border/20 bg-background/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
              Active Roster
            </span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/35">
              {ai?.active_agents ?? 0}/{ai?.active_executives ?? 0}/{ai?.active_specialists ?? 0}
            </span>
          </div>
          <div className="space-y-2">
            {agents.map((agent, i) => (
              <div key={agent.label} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] text-muted-foreground/50">{agent.label}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(agent.value / maxAgents) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ background: agent.color }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-foreground/60">
                  {agent.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/15 bg-background/20 px-3 py-2">
          <span className="text-[10px] text-muted-foreground/40">Cache efficiency</span>
          <span className={cn("font-mono text-[11px] font-semibold tabular-nums", cacheRate > 0.5 ? "text-success" : cacheRate > 0.25 ? "text-warning" : "text-muted-foreground/50")}>
            {Math.round(cacheRate * 100)}% cached
          </span>
        </div>
      </div>
    </div>
  );
}
