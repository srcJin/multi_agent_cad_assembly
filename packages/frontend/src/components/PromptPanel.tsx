import { useState } from "react";
import { useStore } from "../lib/store";
import { runWorkflow, repairOnce, resetProject } from "../lib/api";

const DEFAULT_PROMPT = "Create a 2D cube gearbox with two meshing gears inside a box.";

export function PromptPanel() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const { setAssembly, setLoading, loading, reset } = useStore();
  const run = async () => { setLoading(true); try { setAssembly(await runWorkflow(prompt, true)); } finally { setLoading(false); } };
  const repair = async () => { setLoading(true); try { setAssembly(await repairOnce()); } finally { setLoading(false); } };
  const doReset = async () => { await resetProject(); reset(); };
  return (
    <div>
      <h3>AssemblyCAD AI</h3>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} style={{ width: "100%" }} />
      <button onClick={run} disabled={loading}>Run Full Workflow</button>
      <button onClick={repair} disabled={loading}>Repair Once</button>
      <button onClick={doReset}>Reset</button>
    </div>
  );
}
