import { create } from "zustand";
import type { AssemblyState } from "@cad/shared";

export type TabId = "drawing" | "simulation" | "timeline" | "validation" | "state";
export type DesignPresetId = "cube-gearbox" | "compound-gearbox" | "idler-transfer";

const DEFAULT_PROMPT = "Create a 2D cube gearbox with two meshing gears inside a box.";
const COMPOUND_PROMPT = "Create a compact compound reduction gearbox with four gears across three fixed shafts inside one box.";
const IDLER_PROMPT = "Create an idler transfer gearbox with three gears on three fixed shafts inside one box.";
const PROMPTS: Record<DesignPresetId, string> = {
  "cube-gearbox": DEFAULT_PROMPT,
  "compound-gearbox": COMPOUND_PROMPT,
  "idler-transfer": IDLER_PROMPT,
};

interface AppState {
  assembly: AssemblyState | null;
  activeTab: TabId;
  designPreset: DesignPresetId;
  previewStep: number | null;
  selectedPartId: string | null;
  loading: boolean;
  prompt: string;
  playing: boolean;
  setAssembly: (s: AssemblyState) => void;
  setTab: (t: TabId) => void;
  setPreviewStep: (step: number | null) => void;
  setDesignPreset: (id: DesignPresetId) => void;
  selectPart: (id: string | null) => void;
  setLoading: (b: boolean) => void;
  setPrompt: (p: string) => void;
  setPlaying: (b: boolean) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  assembly: null,
  activeTab: "drawing",
  designPreset: "cube-gearbox",
  previewStep: null,
  selectedPartId: null,
  loading: false,
  prompt: DEFAULT_PROMPT,
  playing: false,
  setAssembly: (s) => set({ assembly: s, previewStep: null }),
  setTab: (t) => set({ activeTab: t }),
  setPreviewStep: (step) => set({ previewStep: step }),
  setDesignPreset: (id) => set({ designPreset: id, prompt: PROMPTS[id] }),
  selectPart: (id) => set({ selectedPartId: id }),
  setLoading: (b) => set({ loading: b }),
  setPrompt: (p) => set({ prompt: p }),
  setPlaying: (b) => set({ playing: b }),
  reset: () => set({ assembly: null, activeTab: "drawing", previewStep: null, selectedPartId: null, loading: false, playing: false }),
}));
