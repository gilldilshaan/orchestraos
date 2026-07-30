"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useMessagesQuery, useUnreadCountQuery } from "@/hooks/use-intelligence";
import {
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Bot,
  ArrowRight,
  Send,
  CheckCircle2,
} from "lucide-react";

const AGENT_ICONS: Record<string, string> = {
  ceo: "👑",
  planner: "📋",
  risk: "⚠️",
  organization: "🏛️",
  decision: "⚖️",
  devils_advocate: "😈",
  dashboard: "📊",
  default: "🤖",
};

const AGENT_LABELS: Record<string, string> = {
  ceo_agent: "CEO",
  planner_agent: "Planner",
  risk_agent: "Risk Analyst",
  organization_agent: "Organization Architect",
  decision_agent: "Decision Maker",
  devils_advocate_agent: "Devil's Advocate",
  dashboard_agent: "Dashboard",
};

function getAgentLabel(agent: string) {
  return AGENT_LABELS[agent] ?? agent.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAgentColor(agent: string) {
  if (agent.includes("ceo")) return "text-amber-400";
  if (agent.includes("planner")) return "text-sky-400";
  if (agent.includes("risk")) return "text-rose-400";
  if (agent.includes("organization")) return "text-emerald-400";
  if (agent.includes("decision")) return "text-violet-400";
  if (agent.includes("devil")) return "text-orange-400";
  if (agent.includes("dashboard")) return "text-cyan-400";
  return "text-muted-foreground";
}

export function CollaborationFeed({ objectiveId }: { objectiveId: string | null }) {
  const { data: messages = [] } = useMessagesQuery(objectiveId);
  const [expanded, setExpanded] = useState(true);

  const conversations = useMemo(() => {
    const pairs = new Map<string, typeof messages>();
    for (const msg of messages) {
      const key = [msg.from_agent, msg.to_agent].sort().join("::");
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key)!.push(msg);
    }
    return Array.from(pairs.entries()).map(([key, msgs]) => ({
      key,
      agents: key.split("::"),
      messages: msgs.sort(
        (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
      ),
      lastMsg: msgs[msgs.length - 1],
    }));
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/40 bg-card/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground/80">Agent Collaboration</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {messages.length}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-border/30 px-3 py-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {conversations.map((conv) => (
                <div key={conv.key} className="rounded-md bg-muted/30 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mb-1.5">
                    <span className={getAgentColor(conv.agents[0])}>{getAgentLabel(conv.agents[0])}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className={getAgentColor(conv.agents[1])}>{getAgentLabel(conv.agents[1])}</span>
                  </div>
                  {conv.messages.slice(-3).map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2 py-1">
                      <span className="mt-0.5 shrink-0 text-xs">{AGENT_ICONS[msg.from_agent] ?? AGENT_ICONS.default}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[11px] font-medium", getAgentColor(msg.from_agent))}>
                            {getAgentLabel(msg.from_agent)}
                          </span>
                          {msg.status === "read" && <CheckCircle2 className="h-3 w-3 text-emerald-400/60" />}
                        </div>
                        <p className="text-[10px] leading-relaxed text-foreground/70">{msg.subject}</p>
                        {msg.body && (
                          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground line-clamp-2">
                            {msg.body}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
