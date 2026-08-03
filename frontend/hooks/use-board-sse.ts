import { useEffect, useRef, useState } from "react";

import { type BoardEvent, type BoardMessage } from "@/types";

type BoardSSEState = {
  connected: boolean;
  messages: BoardMessage[];
  phase: string | null;
  phaseStatus: string | null;
  phaseMessage: string | null;
  phaseProgress: number;
  lastError: string | null;
};

export function useBoardSSE(boardId: string | null | undefined) {
  const [state, setState] = useState<BoardSSEState>({
    connected: false,
    messages: [],
    phase: null,
    phaseStatus: null,
    phaseMessage: null,
    phaseProgress: 0,
    lastError: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!boardId) return;
    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    const es = new EventSource(`${API_BASE}/board/${boardId}/events`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setState((s) => ({ ...s, connected: true, lastError: null }));
    };

    es.onmessage = (event) => {
      try {
        const data: BoardEvent = JSON.parse(event.data);
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
          if (data.type === "message") {
            const msg = data.message as BoardMessage;
            return {
              ...s,
              messages: [...s.messages, msg],
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
  }, [boardId]);

  return state;
}