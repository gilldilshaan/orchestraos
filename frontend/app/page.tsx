export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base px-6">
      <span className="font-mono text-tag uppercase tracking-wide text-text-secondary">Phase 0 · Foundation</span>
      <h1 className="text-display font-display font-semibold text-text-primary">OrchestraOS</h1>
      <p className="max-w-md text-center text-body text-text-secondary">
        Design tokens, fonts, providers, and mock data are wired up. Pages land in the phases that follow.
      </p>
    </main>
  );
}
