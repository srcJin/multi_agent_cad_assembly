import type { AssemblyState } from "@cad/shared";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const params = { module: 2, teethA: 20, teethB: 20 };

export async function runWorkflow(prompt: string, seedFailure = true): Promise<AssemblyState> {
  const r = await fetch(`${BASE}/workflow/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, params, seedFailure }) });
  if (!r.ok) throw new Error(`run failed: ${r.status}`);
  return r.json();
}
export async function repairOnce(): Promise<AssemblyState> {
  const r = await fetch(`${BASE}/workflow/repair`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ params }) });
  if (!r.ok) throw new Error(`repair failed: ${r.status}`);
  return r.json();
}
export async function resetProject(): Promise<void> { await fetch(`${BASE}/reset`, { method: "POST" }); }
