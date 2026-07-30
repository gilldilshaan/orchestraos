import { create } from "zustand";
import type { ExecutionStatus, Objective, OrganizationNode } from "@/types";

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true,
  isCollapsed: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  collapse: () => set({ isCollapsed: true, isOpen: false }),
  expand: () => set({ isCollapsed: false, isOpen: true }),
}));

interface ExecutionState {
  status: ExecutionStatus;
  currentObjective: Objective | null;
  events: ExecutionEvent[];
  organization: OrganizationNode[];
  startTime: number | null;
  setStatus: (status: ExecutionStatus) => void;
  setObjective: (objective: Objective | null) => void;
  addEvent: (event: ExecutionEvent) => void;
  setOrganization: (nodes: OrganizationNode[]) => void;
  reset: () => void;
}

interface ExecutionEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  message: string;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  status: "idle",
  currentObjective: null,
  events: [],
  organization: [],
  startTime: null,
  setStatus: (status) => set({ status }),
  setObjective: (objective) => set({ currentObjective: objective }),
  addEvent: (event) =>
    set((s) => ({ events: [...s.events, event].slice(-200) })),
  setOrganization: (nodes) => set({ organization: nodes }),
  reset: () =>
    set({
      status: "idle",
      currentObjective: null,
      events: [],
      organization: [],
      startTime: null,
    }),
}));

interface MetricsState {
  averageConfidence: number;
  totalRuntime: number;
  successRate: number;
  executivesSpawned: number;
  specialistsSpawned: number;
  healthScore: number;
  averageRetries: number;
  averageExecutionTime: number;
  setMetrics: (metrics: Partial<MetricsState>) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  averageConfidence: 0,
  totalRuntime: 0,
  successRate: 0,
  executivesSpawned: 0,
  specialistsSpawned: 0,
  healthScore: 0,
  averageRetries: 0,
  averageExecutionTime: 0,
  setMetrics: (metrics) => set(metrics),
}));

interface ThemeState {
  mode: "dark" | "light" | "system";
  setMode: (mode: "dark" | "light" | "system") => void;
  resolvedMode: "dark" | "light";
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "dark",
  resolvedMode: "dark",
  setMode: (mode) => {
    if (mode === "dark") {
      document.documentElement.classList.remove("light");
    } else if (mode === "light") {
      document.documentElement.classList.add("light");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      document.documentElement.classList.toggle("light", !prefersDark);
    }
    set({ mode, resolvedMode: mode === "system" ? "dark" : mode });
  },
}));

interface CommandPaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

interface ObjectiveContextState {
  activeObjectiveId: string | null;
  setActiveObjectiveId: (id: string | null) => void;
  clearActiveObjectiveId: () => void;
}

export const useObjectiveContextStore = create<ObjectiveContextState>((set) => ({
  activeObjectiveId: null,
  setActiveObjectiveId: (id) => set({ activeObjectiveId: id }),
  clearActiveObjectiveId: () => set({ activeObjectiveId: null }),
}));

interface InspectorState {
  isOpen: boolean;
  selectedNodeId: string | null;
  toggle: () => void;
  selectNode: (id: string | null) => void;
  close: () => void;
}

export const useInspectorStore = create<InspectorState>((set) => ({
  isOpen: true,
  selectedNodeId: null,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  selectNode: (id) => set({ selectedNodeId: id, isOpen: id !== null }),
  close: () => set({ isOpen: false, selectedNodeId: null }),
}));
