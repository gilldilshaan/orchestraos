"use client";

export function FooterStatus() {
  return (
    <footer className="border-t border-border/30 pt-4 pb-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] text-muted-foreground">
        <span className="font-mono">v0.1.0</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Backend connected
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Telemetry connected
        </span>
        <span className="font-mono">API: 12ms</span>
        <span className="font-mono">Model: gpt-4o</span>
        <span className="font-mono">Commit: a1b2c3d</span>
      </div>
    </footer>
  );
}
