import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  activeWizardStep: number;
  setActiveWizardStep: (step: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  activeWizardStep: 0,
  setActiveWizardStep: (step) => set({ activeWizardStep: step }),
}));
