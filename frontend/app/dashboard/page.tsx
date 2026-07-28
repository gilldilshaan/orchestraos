export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Coming soon — aggregate view of your organization
      </p>
      <a
        href="/"
        className="mt-6 text-sm text-muted-foreground underline hover:text-foreground"
      >
        Back to home
      </a>
    </div>
  );
}
