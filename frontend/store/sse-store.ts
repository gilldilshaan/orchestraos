"use client";

import { create } from "zustand";

export interface SSEEvent {
  timestamp: string | null;
  stage: string;
  status: string;
  message: string;
  progress: number;
  metadata?: Record<string, unknown>;
}

interface SSEState {
  events: SSEEvent[];
  currentStage: string;
  currentMessage: string;
  progress: number;
  connected: boolean;
  pipelineStatus: string;
  addEvent: (event: SSEEvent) => void;
  reset: () => void;
}

export const useSSEStore = create<SSEState>((set) => ({
  events: [],
  currentStage: "initializing",
      currentMessage: "",
  progress: 0,
  connected: false,
  pipelineStatus: "idle",
  addEvent: (event) =>
    set((state) => {
      const events = [...state.events, event];
      const isPipeline = event.stage === "pipeline";
      return {
        events,
        currentStage: isPipeline ? state.currentStage : event.stage,
        currentMessage: event.message,
        progress: event.progress,
        connected: event.status === "connected" ? true : state.connected,
        pipelineStatus: isPipeline ? event.status : state.pipelineStatus,
      };
    }),
  reset: () =>
    set({
      events: [],
      currentStage: "initializing",
  currentMessage: "",
      progress: 0,
      connected: false,
      pipelineStatus: "idle",
    }),
}));
