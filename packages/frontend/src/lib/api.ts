import type { AssemblyState } from "@cad/shared";
import type { DesignPresetId } from "./store";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface WorkflowParams {
  designId: DesignPresetId;
  module: number;
  teethA: number;
  teethB: number;
  teethC?: number;
  teethD?: number;
}

export function paramsForDesign(designId: DesignPresetId): WorkflowParams {
  if (designId === "compound-gearbox") {
    return { designId, module: 2, teethA: 16, teethB: 36, teethC: 14, teethD: 34 };
  }
  if (designId === "idler-transfer") {
    return { designId, module: 2, teethA: 18, teethB: 28, teethC: 22 };
  }
  return { designId, module: 2, teethA: 20, teethB: 20 };
}

export async function runWorkflow(prompt: string, designId: DesignPresetId, seedFailure = true): Promise<AssemblyState> {
  const params = paramsForDesign(designId);
  const r = await fetch(`${BASE}/workflow/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, params, seedFailure }) });
  if (!r.ok) throw new Error(`run failed: ${r.status}`);
  return r.json();
}
export async function repairOnce(designId: DesignPresetId): Promise<AssemblyState> {
  const params = paramsForDesign(designId);
  const r = await fetch(`${BASE}/workflow/repair`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ params }) });
  if (!r.ok) throw new Error(`repair failed: ${r.status}`);
  return r.json();
}
export async function resetProject(): Promise<void> { await fetch(`${BASE}/reset`, { method: "POST" }); }
