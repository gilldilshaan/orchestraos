"use client";

import { useEffect, useRef } from "react";
import { useSSEStore, type SSEEvent } from "@/store/sse-store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function useSSE(objectiveId: string | null | undefined) {
  const addEvent = useSSEStore((s) => s.addEvent);
  const reset = useSSEStore((s) => s.reset);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!objectiveId) return;

    reset();

    const url = `${API_BASE_URL}/objectives/${objectiveId}/events`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (msg) => {
      try {
        const event: SSEEvent = JSON.parse(msg.data);
        addEvent(event);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [objectiveId, addEvent, reset]);
}
