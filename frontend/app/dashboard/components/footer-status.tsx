"use client";

import { useHealthAiQuery, useSystemHealthQuery } from "@/hooks/use-api";

export function FooterStatus() {
  const { data: ai } = useHealthAiQuery();
  const { data: system } = useSystemHealthQuery();

  const version = system?.version ?? "—";
  const model = ai?.model ?? "—";
  const provider = ai?.provider ?? "—";
  const backendHealthy = system?.status === "healthy";

  return (
    <footer className="border-t border-border/30 pt-4 pb-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] text-muted-foreground">
        <span className="font-mono">v{version}</span>
        <span className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${backendHealthy ? "bg-success" : "bg-destructive"}`} />
          Backend {backendHealthy ? "connected" : "disconnected"}
        </span>
        <span className="font-mono">Provider: {provider}</span>
        <span className="font-mono">Model: {model}</span>
        {ai?.kernel && (
          <>
            <span className="font-mono">Calls: {ai.kernel.total_calls}</span>
            <span className="font-mono">Tokens: {ai.kernel.tokens_used}</span>
          </>
        )}
      </div>
    </footer>
  );
}
