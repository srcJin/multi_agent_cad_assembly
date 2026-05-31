import { useStore } from "../lib/store";

export function PromptPanel() {
  const { prompt, setPrompt, assembly } = useStore();

  return (
    <div className="pane-section">
      <h2 className="pane-title">Design Request</h2>
      <textarea
        className="prompt-area"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        spellCheck={false}
      />

      <div className="field-label">Parameters (fixed for MVP)</div>
      <div className="params-row">
        <label className="param">
          <span className="cap">module</span>
          <input value="2" readOnly />
        </label>
        <label className="param">
          <span className="cap">teeth A</span>
          <input value="20" readOnly />
        </label>
        <label className="param">
          <span className="cap">teeth B</span>
          <input value="20" readOnly />
        </label>
      </div>

      <div className="field-label">Pipeline</div>
      <p style={{ color: "var(--text-dim)", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
        Director → Layout → 6 Part Agents → Simulation → Validation → Repair.
        Each agent and tool call is traced in <strong>W&amp;B Weave</strong>.
      </p>

      {assembly && (
        <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 14 }}>
          {assembly.parts.length} parts · {assembly.agents.length} agents ·{" "}
          {assembly.timeline.length} steps
        </p>
      )}
    </div>
  );
}
