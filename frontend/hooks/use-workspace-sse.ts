import { useEffect, useRef, useState } from "react";

import { type WorkspaceEvent, type WorkspaceItem } from "@/types";

type WorkspaceSSEState = {
  connected: boolean;
  items: WorkspaceItem[];
  phase: string | null;
  phaseStatus: string | null;
  phaseMessage: string | null;
  phaseProgress: number;
  lastError: string | null;
};

export function useWorkspaceSSE(
  objectiveId: string | null | undefined,
  executiveRole: string | null | undefined,
) {
  const [state, setState] = useState<WorkspaceSSEState>({
    connected: false,
    items: [],
    phase: null,
    phaseStatus: null,
    phaseMessage: null,
    phaseProgress: 0,
    lastError: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!objectiveId || !executiveRole) return;
    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const es = new EventSource(
      `${API_BASE}/executive-workspace/${objectiveId}/${executiveRole}/events`,
    );
    eventSourceRef.current = es;

    es.onopen = () => {
      setState((s) => ({ ...s, connected: true, lastError: null }));
    };

    es.onmessage = (event) => {
      try {
        const data: WorkspaceEvent = JSON.parse(event.data);
        setState((s) => {
          if (data.type === "connected") {
            return {
              ...s,
              connected: true,
              phase: data.phase,
              phaseStatus: data.status,
              phaseMessage: data.message,
              phaseProgress: data.progress,
            };
          }
          if (data.type === "phase") {
            return {
              ...s,
              phase: data.phase,
              phaseStatus: data.status,
              phaseMessage: data.message,
              phaseProgress: data.progress,
            };
          }
          if (data.type === "item") {
            const item = data.item as WorkspaceItem;
            return {
              ...s,
              items: [...s.items, item],
            };
          }
          return s;
        });
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = (err) => {
      setState((s) => ({
        ...s,
        connected: false,
        lastError: "SSE connection error",
      }));
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [objectiveId, executiveRole]);

  return state;
}