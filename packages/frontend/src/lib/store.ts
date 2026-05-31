import { create } from "zustand";
import type { AssemblyState } from "@cad/shared";

export type TabId = "drawing" | "simulation" | "orchestration" | "timeline" | "validation" | "state";

const DEFAULT_PROMPT = "Create a 2D cube gearbox with two meshing gears inside a box.";

interface AppState {
  assembly: AssemblyState | null;
  activeTab: TabId;
  selectedPartId: string | null;
  loading: boolean;
  prompt: string;
  playing: boolean;
  setAssembly: (s: AssemblyState) => void;
  setTab: (t: TabId) => void;
  selectPart: (id: string | null) => void;
  setLoading: (b: boolean) => void;
  setPrompt: (p: string) => void;
  setPlaying: (b: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  assembly: null,
  activeTab: "drawing",
  selectedPartId: null,
  loading: false,
  prompt: DEFAULT_PROMPT,
  playing: false,
  setAssembly: (s) => set({ assembly: s }),
  setTab: (t) => set({ activeTab: t }),
  selectPart: (id) => set({ selectedPartId: id }),
  setLoading: (b) => set({ loading: b }),
  setPrompt: (p) => set({ prompt: p }),
  setPlaying: (b) => set({ playing: b }),
  reset: () => set({ assembly: null, activeTab: "drawing", selectedPartId: null, loading: false, playing: false }),
}));
