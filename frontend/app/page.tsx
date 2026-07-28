export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold tracking-tight">OrchestraOS</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Organizational Intelligence Platform
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Dashboard
        </a>
        <a
          href="/api/v1/health/system"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Health
        </a>
      </div>
    </main>
  );
}
