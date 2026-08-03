"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Gavel, Users, Scale, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { useBoardSSE } from "@/hooks/use-board-sse";
import { useBoardSessionQuery, useBoardMessagesQuery } from "@/hooks/use-api";

import { PageHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type {
  BoardMessage,
  BoardSession,
  BoardRollCallEntry,
  BoardConflict,
} from "@/types";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  CEO: <Gavel className="h-4 w-4" />,
  Planner: <Users className="h-4 w-4" />,
  Engineering: <Users className="h-4 w-4" />,
  Finance: <Scale className="h-4 w-4" />,
  Marketing: <MessageSquare className="h-4 w-4" />,
  Legal: <Scale className="h-4 w-4" />,
  Risk: <AlertTriangle className="h-4 w-4" />,
  Operations: <Users className="h-4 w-4" />,
};

const STANCE_COLORS: Record<string, string> = {
  support: "bg-success/10 text-success border-success/20",
  conditional: "bg-warning/10 text-warning border-warning/20",
  concerned: "bg-warning/10 text-warning border-warning/20",
  oppose: "bg-destructive/10 text-destructive border-destructive/20",
};

const VOTE_COLORS: Record<string, string> = {
  approve: "bg-success/10 text-success border-success/20",
  conditional: "bg-warning/10 text-warning border-warning/20",
  abstain: "bg-muted/50 text-muted-foreground border-muted",
  reject: "bg-destructive/10 text-destructive border-destructive/20",
};

const KIND_LABELS: Record<string, string> = {
  opening_statement: "Opening",
  deliberation: "Deliberation",
  response: "Response",
  vote: "Vote",
  consensus: "Consensus",
  system: "System",
};

function MessageCard({ message, isLast }: { message: BoardMessage; isLast: boolean }) {
  const stanceClass = STANCE_COLORS[message.stance ?? ""] || "bg-muted/50 text-muted-foreground border-muted";
  const kindLabel = KIND_LABELS[message.kind] ?? message.kind;
  const roleIcon = ROLE_ICONS[message.sender] ?? <Users className="h-4 w-4" />;

  return (
    <div
      className={`relative flex flex-col gap-2 p-4 rounded-xl border transition-colors ${
        isLast ? "ring-2 ring-primary/30" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-primary">{roleIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{message.sender}</span>
            <Badge variant="outline" className="text-xs">{kindLabel}</Badge>
            {message.round > 0 && (
              <Badge variant="secondary" className="text-xs">Round {message.round}</Badge>
            )}
            {message.stance && (
              <Badge
                variant="outline"
                className={`text-xs ${stanceClass}`}
              >
                {message.stance}
              </Badge>
            )}
            {message.confidence != null && (
              <Badge variant="outline" className="text-xs">
                {Math.round(message.confidence * 100)}%
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {message.title}
          </p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(message.created_at).toLocaleTimeString()}
        </span>
      </div>
      {message.content && (
        <div className="ml-10 pl-4 border-l border-border/50">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{message.content}</p>
        </div>
      )}
      {message.payload && Object.keys(message.payload).length > 0 && (
        <details className="ml-10 mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer select-none">
            Payload
          </summary>
          <pre className="mt-1 ml-4 text-xs text-muted-foreground/70 overflow-x-auto">
            {JSON.stringify(message.payload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function BoardSessionPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const { data: sessionData, isLoading: sessionLoading, refetch: refetchSession } = useBoardSessionQuery(boardId);
  const { data: messagesData, isLoading: messagesLoading } = useBoardMessagesQuery(boardId, 0, 500);
  const sse = useBoardSSE(boardId);

  const session = sessionData;
  const messages = messagesData?.messages ?? [];

  // Merge SSE messages (which arrive live) with queried messages
  const mergedMessages = useMemo<BoardMessage[]>(() => {
    const map = new Map(messages.map((m) => [m.id, m]));
    sse.messages.forEach((m: BoardMessage) => map.set(m.id, m));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [messages, sse.messages]);

  useEffect(() => {
    if (session?.status === "running" && sse.connected) {
      const interval = setInterval(() => {
        refetchSession();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [session?.status, sse.connected, refetchSession]);

  if (sessionLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Board session not found.</p>
      </div>
    );
  }

  const isRunning = session.status === "running";
  const rollCall = (session.result?.roll_call ?? []) as BoardRollCallEntry[];
  const counts = session.result?.counts ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={session.roster.join(" • ")}
        title={session.title}
        description={session.topic}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={isRunning ? "default" : "secondary"} className="gap-1">
              {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
              {session.status}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => router.push("/board")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Transcript */}
          <PremiumCard variant="glass" className="p-0">
            <div className="border-b border-border/50 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold">Live Transcript</h3>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    sse.connected ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {sse.connected ? "Live" : "Disconnected"}
                </span>
                {isRunning && sse.phase && (
                  <span className="text-sm text-muted-foreground">
                    {sse.phaseStatus === "started" ? "▶" : "✓"} {sse.phase} {Math.round(sse.phaseProgress)}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-[600px] p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent">
              {mergedMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="mx-auto h-10 w-10 mb-2 opacity-50" />
                  <p>Waiting for the board to convene…</p>
                </div>
              ) : (
                mergedMessages.map((m) => (
                  <MessageCard key={m.id} message={m} isLast={mergedMessages[mergedMessages.length - 1]?.id === m.id} />
                ))
              )}
            </div>
          </PremiumCard>

          {/* Result / Consensus */}
          {session.result && (
            <PremiumCard variant="glass" className="p-5">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Final Consensus
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      session.result.verdict === "approve"
                        ? "default"
                        : session.result.verdict === "reject"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-sm px-3 py-1"
                  >
                    {session.result.verdict.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {session.result.mood}
                  </Badge>
                  {session.result.overall_confidence != null && (
                    <Badge variant="outline" className="text-sm">
                      Confidence: {Math.round(session.result.overall_confidence * 100)}%
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{session.result.decision}</p>
                <p className="text-sm text-muted-foreground">{session.result.rationale}</p>
                {session.result.adopted_conditions?.length && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Adopted Conditions</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {session.result.adopted_conditions.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {session.result.action_items?.length && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Action Items</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {session.result.action_items.map((a: string, i: number) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {session.result.minority_reports?.length && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-warning">Minority Reports</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {session.result.minority_reports.map((r: { who: string; point: string }, i: number) => (
                        <li key={i}>
                          <strong>{r.who}:</strong> {r.point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </PremiumCard>
          )}
        </div>

        <aside className="space-y-6">
          {/* Roster / Status */}
          <PremiumCard variant="glass" className="p-4">
            <h3 className="mb-4 font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Executive Roster
            </h3>
            <div className="space-y-2">
              {session.roster.map((role: string) => {
                const vote = rollCall.find((r: BoardRollCallEntry) => r.role === role);
                return (
                  <div
                    key={role}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-primary">{ROLE_ICONS[role]}</span>
                      <span className="font-medium">{role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {vote && (
                        <Badge
                          variant={
                            vote.vote === "approve" || vote.stance === "support"
                              ? "default"
                              : vote.vote === "reject" || vote.stance === "oppose"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {vote.vote || vote.stance}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </PremiumCard>

          {/* Vote Tally */}
          {rollCall.length > 0 && (
            <PremiumCard variant="glass" className="p-4">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Roll-Call Tally
              </h3>
              <div className="space-y-2">
                {[
                  { key: "approve", label: "Approve", icon: CheckCircle2 },
                  { key: "conditional", label: "Conditional", icon: AlertTriangle },
                  { key: "abstain", label: "Abstain", icon: XCircle },
                  { key: "reject", label: "Reject", icon: XCircle },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>
                    <span
                      className={`font-mono font-semibold ${VOTE_COLORS[key]?.split(" ")[1] || ""}`}
                    >
                      {counts[key] ?? 0}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span>Total</span>
                  <span className="font-mono">{rollCall.length}</span>
                </div>
              </div>
            </PremiumCard>
          )}

          {/* Conflicts */}
          {session.result?.conflicts?.length && (
            <PremiumCard variant="glass" className="p-4 border-destructive/30">
              <h3 className="mb-3 font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Open Conflicts
              </h3>
              <ul className="space-y-2 text-sm">
                {session.result.conflicts.map((c: BoardConflict, i: number) => (
                  <li key={i} className="p-2 rounded bg-destructive/5">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-muted-foreground">{c.parties.join(", ")}</div>
                    <div className="text-xs text-destructive/80">{c.severity} • {c.status}</div>
                  </li>
                ))}
              </ul>
            </PremiumCard>
          )}

          {/* Progress */}
          {isRunning && (
            <PremiumCard variant="glass" className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(sse.phaseProgress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${sse.phaseProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Current phase: {sse.phase ?? "initializing"} ({sse.phaseStatus})
                </p>
              </div>
            </PremiumCard>
          )}
        </aside>
      </div>
    </div>
  );
}