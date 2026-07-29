import { create } from "zustand";

/* ───────── Timeline Store ───────── */
interface TimelineState {
  paused: boolean;
  searchQuery: string;
  typeFilter: string[];
  currentTime: number;
  speed: number;
  setPaused: (p: boolean) => void;
  togglePaused: () => void;
  setSearchQuery: (q: string) => void;
  setTypeFilter: (types: string[]) => void;
  toggleTypeFilter: (type: string) => void;
  setCurrentTime: (t: number) => void;
  setSpeed: (s: number) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  paused: false,
  searchQuery: "",
  typeFilter: [],
  currentTime: 0,
  speed: 1,
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  toggleTypeFilter: (type) =>
    set((s) => ({
      typeFilter: s.typeFilter.includes(type)
        ? s.typeFilter.filter((t) => t !== type)
        : [...s.typeFilter, type],
    })),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setSpeed: (speed) => set({ speed }),
}));

/* ───────── Replay Store ───────── */
interface ReplayState {
  active: boolean;
  position: number;
  isPlaying: boolean;
  speed: number;
  setActive: (a: boolean) => void;
  setPosition: (p: number) => void;
  setPlaying: (p: boolean) => void;
  togglePlaying: () => void;
  setSpeed: (s: number) => void;
}

export const useReplayStore = create<ReplayState>((set) => ({
  active: false,
  position: 0,
  isPlaying: false,
  speed: 1,
  setActive: (active) => set({ active }),
  setPosition: (position) => set({ position }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setSpeed: (speed) => set({ speed }),
}));

/* ───────── View Store ───────── */
type CenterView = "organization" | "dag";

interface ViewState {
  centerView: CenterView;
  setCenterView: (v: CenterView) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  centerView: "organization",
  setCenterView: (centerView) => set({ centerView }),
}));
