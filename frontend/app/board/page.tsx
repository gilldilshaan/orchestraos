"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowRight, Users, Gavel, Loader2, AlertCircle } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useStartBoard, useBoardSessionsQuery } from "@/hooks/use-api";

import { PageHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { BoardSession, StartBoardRequest } from "@/types";

export default function BoardPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [rosterInput, setRosterInput] = useState("");
  const [rounds, setRounds] = useState(3);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState("");

  const { data: sessionsData, isLoading: sessionsLoading } = useBoardSessionsQuery(0, 20);
  const { mutateAsync: startBoard, isPending: starting } = useStartBoard();

  // Fetch available objectives for the selector
  const { data: objectivesData } = useQuery({
    queryKey: ["objectives", "list"],
    queryFn: () => apiClient.get<{ objectives: Array<{ id: string; raw_input: string }> }>("/objectives?limit=50"),
    staleTime: 30_000,
  });

  const objectives = objectivesData?.objectives ?? [];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObjectiveId) return;
    const roster = rosterInput ? rosterInput.split(",").map((r) => r.trim()) : undefined;
    const result = await startBoard({ objective_id: selectedObjectiveId, title: title || undefined, roster, rounds });
    if (result?.id) {
      router.push(`/board/${result.id}`);
    }
  };

  const sessions = sessionsData?.sessions ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Executive Board"
        title="Board Sessions"
        description="Convene a fixed roster of AI executives to deliberate and reach consensus on any objective."
        actions={
          <Button onClick={() => router.push("/board/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Start New Board
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <PremiumCard variant="glass" className="p-5">
            <h3 className="mb-4 text-lg font-semibold">Recent Sessions</h3>
            {sessionsLoading ? (
              <div className="space-y-3" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse bg-muted/50 rounded-lg" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-10 w-10 mb-2 opacity-50" />
                <p>No board sessions yet.</p>
                <p className="text-sm mt-1">Start your first deliberation.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {sessions.map((s: BoardSession) => (
                  <Link
                    key={s.id}
                    href={`/board/${s.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{s.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{s.topic}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === "completed"
                            ? "bg-success/10 text-success"
                            : s.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {s.status}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </PremiumCard>
        </div>

        <aside className="space-y-4">
          <PremiumCard variant="glass" className="p-5">
            <h3 className="mb-4 text-lg font-semibold">Start a New Board</h3>
            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label htmlFor="objective" className="block text-sm font-medium mb-1">
                  Objective <span className="text-destructive">*</span>
                </label>
                <Select
                  value={selectedObjectiveId}
                  onValueChange={setSelectedObjectiveId}
                >
                  <SelectTrigger id="objective">
                    <SelectValue placeholder="Select an objective…" />
                  </SelectTrigger>
                  <SelectContent>
                    {objectives.map((o: { id: string; raw_input: string }) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.raw_input.slice(0, 80)}…
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Title (optional)
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Strategy call — Q3 Launch"
                />
              </div>

              <div>
                <label htmlFor="roster" className="block text-sm font-medium mb-1">
                  Executive Roster (optional)
                </label>
                <Input
                  id="roster"
                  value={rosterInput}
                  onChange={(e) => setRosterInput(e.target.value)}
                  placeholder="CEO, Planner, Engineering, Finance, Marketing, Legal, Risk, Operations"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated. Defaults to all eight roles.
                </p>
              </div>

              <div>
                <label htmlFor="rounds" className="block text-sm font-medium mb-1">
                  Deliberation Rounds
                </label>
                <Select value={String(rounds)} onValueChange={(v) => setRounds(Number(v))}>
                  <SelectTrigger id="rounds" className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} rounds
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={starting || !selectedObjectiveId} className="w-full">
                {starting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Convening…
                  </>
                ) : (
                  <>
                    <Gavel className="mr-2 h-4 w-4" />
                    Convene Board
                  </>
                )}
              </Button>
            </form>
          </PremiumCard>

          <PremiumCard variant="glass" className="p-5 border-warning/30">
            <h3 className="mb-3 text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              How It Works
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">1.</span>Pick an objective and optional custom roster.</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">2.</span>Each executive gives an opening statement.</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">3.</span>Deliberation: challenge, question, condition.</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">4.</span>Cross-examination: direct responses.</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">5.</span>Roll-call vote from every seat.</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">6.</span>CEO synthesizes the final consensus.</li>
            </ol>
          </PremiumCard>
        </aside>
      </div>
    </div>
  );
}