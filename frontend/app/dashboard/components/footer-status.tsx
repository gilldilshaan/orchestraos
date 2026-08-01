"use client";

import { useHealthAiQuery, useSystemHealthQuery } from "@/hooks/use-api";
import { PulseRing } from "@/components/premium/page-transition";

export function FooterStatus() {
  const { data: ai } = useHealthAiQuery();
  const { data: system } = useSystemHealthQuery();

  const version = system?.version ?? "\u2014";
  const model = ai?.model ?? "\u2014";
  const provider = ai?.provider ?? "\u2014";
  const backendHealthy = system?.status === "healthy";

  return (
    <footer className="border-t border-border/20 pt-4 pb-1">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] text-muted-foreground/40">
        <span className="font-mono">v{version}</span>
        <span className="flex items-center gap-1.5">
          <PulseRing active={backendHealthy} color={backendHealthy ? "hsl(var(--success))" : "hsl(var(--destructive))"} size={4} />
          {backendHealthy ? "Connected" : "Disconnected"}
        </span>
        <span className="text-muted-foreground/30">{provider} / {model}</span>
        {ai?.kernel && (
          <>
            <span className="text-muted-foreground/30">Calls: {ai.kernel.total_calls}</span>
            <span className="hidden text-muted-foreground/30 md:inline">Tokens: {ai.kernel.tokens_used}</span>
          </>
        )}
      </div>
    </footer>
  );
}
