import Link from "next/link";
import { Compass, ArrowLeft, Orbit } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-card shadow-card">
          <Compass className="h-7 w-7 text-primary" />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/40">
          Error 404
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground/95">
          This sector of the organization doesn&apos;t exist
        </h1>
        <p className="mx-auto max-w-md text-pretty text-[13px] leading-relaxed text-muted-foreground/60">
          The page you&apos;re looking for was moved, renamed, or never compiled into the
          pipeline.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <Link
          href="/execution"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/50 px-4 py-2 text-xs font-medium text-secondary-foreground/70 transition-all hover:bg-muted/30 hover:text-foreground"
        >
          <Orbit className="h-3.5 w-3.5" />
          Live Execution
        </Link>
      </div>
    </div>
  );
}
