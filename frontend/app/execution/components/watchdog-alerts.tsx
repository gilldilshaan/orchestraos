"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  useUnresolvedAlertsQuery,
  useAcknowledgeAlert,
  useResolveAlert,
} from "@/hooks/use-intelligence";
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Eye,
} from "lucide-react";

const SEVERITY_ICONS: Record<string, typeof Bell> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 border-red-500/20 bg-red-500/10",
  warning: "text-amber-400 border-amber-500/20 bg-amber-500/10",
  info: "text-sky-400 border-sky-500/20 bg-sky-500/10",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-500/10",
  warning: "bg-amber-500/10",
  info: "bg-sky-500/10",
};

export function WatchdogAlerts({ objectiveId }: { objectiveId: string | null }) {
  const { data: unresolved = [] } = useUnresolvedAlertsQuery(objectiveId);
  const acknowledge = useAcknowledgeAlert();
  const resolve = useResolveAlert();
  const [expanded, setExpanded] = useState(unresolved.length > 0);

  const criticalCount = unresolved.filter((a) => a.severity === "critical").length;
  const warningCount = unresolved.filter((a) => a.severity === "warning").length;

  if (unresolved.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-red-400" /> : <ChevronRight className="h-3.5 w-3.5 text-red-400" />}
        <Bell className="h-3.5 w-3.5 text-red-400" />
        <span className="text-xs font-semibold text-red-300">Watchdog Alerts</span>
        <div className="ml-auto flex items-center gap-1">
          {criticalCount > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              {warningCount} warnings
            </span>
          )}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-red-500/10 px-3 py-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {unresolved.map((alert) => {
                const SeverityIcon = SEVERITY_ICONS[alert.severity] ?? AlertTriangle;
                return (
                  <div
                    key={alert.id}
                    className={cn("rounded-md border p-2.5", SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.warning)}
                  >
                    <div className="flex items-start gap-2">
                      <SeverityIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold">{alert.alert_type.replace(/_/g, " ")}</span>
                          <span className="rounded bg-background/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-foreground/70">{alert.message}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {!alert.acknowledged && (
                            <button
                              onClick={() => acknowledge.mutate(alert.id)}
                              className="flex items-center gap-1 rounded-md bg-background/50 px-2 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-3 w-3" />
                              Acknowledge
                            </button>
                          )}
                          <button
                            onClick={() => resolve.mutate(alert.id)}
                            className="flex items-center gap-1 rounded-md bg-background/50 px-2 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
