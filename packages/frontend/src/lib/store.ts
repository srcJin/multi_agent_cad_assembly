import { create } from "zustand";
import type { AssemblyState } from "@cad/shared";

export type TabId = "drawing" | "simulation" | "orchestration" | "timeline" | "validation" | "state";

interface AppState {
  assembly: AssemblyState | null;
  activeTab: TabId;
  selectedPartId: string | null;
  loading: boolean;
  setAssembly: (s: AssemblyState) => void;
  setTab: (t: TabId) => void;
  selectPart: (id: string | null) => void;
  setLoading: (b: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  assembly: null, activeTab: "drawing", selectedPartId: null, loading: false,
  setAssembly: (s) => set({ assembly: s }),
  setTab: (t) => set({ activeTab: t }),
  selectPart: (id) => set({ selectedPartId: id }),
  setLoading: (b) => set({ loading: b }),
  reset: () => set({ assembly: null, activeTab: "drawing", selectedPartId: null, loading: false }),
}));
