import { create } from "zustand";

interface SessionState {
  activeObjectiveId: string | null;
  setActiveObjectiveId: (id: string | null) => void;

  recentCommandActions: string[];
  pushRecentCommandAction: (actionId: string) => void;
}

const MAX_RECENT_ACTIONS = 5;

export const useSessionStore = create<SessionState>((set, get) => ({
  activeObjectiveId: null,
  setActiveObjectiveId: (id) => set({ activeObjectiveId: id }),

  recentCommandActions: [],
  pushRecentCommandAction: (actionId) => {
    const next = [actionId, ...get().recentCommandActions.filter((id) => id !== actionId)].slice(
      0,
      MAX_RECENT_ACTIONS,
    );
    set({ recentCommandActions: next });
  },
}));
