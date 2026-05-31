import { useStore } from "../lib/store";
import { paramsForDesign } from "../lib/api";

export function PromptPanel() {
  const { prompt, setPrompt, assembly, designPreset, setDesignPreset } = useStore();
  const params = paramsForDesign(designPreset);
  const isCompound = designPreset === "compound-gearbox";
  const hasGearC = designPreset !== "cube-gearbox";
  const partAgentCount = designPreset === "compound-gearbox" ? 9 : designPreset === "idler-transfer" ? 8 : 6;

  return (
    <div className="pane-section">
      <h2 className="pane-title">Design Request</h2>
      <div className="design-switch" role="group" aria-label="Design preset">
        <button
          className={`design-option ${designPreset === "cube-gearbox" ? "active" : ""}`}
          onClick={() => setDesignPreset("cube-gearbox")}
          type="button"
        >
          Cube gearbox
        </button>
        <button
          className={`design-option ${isCompound ? "active" : ""}`}
          onClick={() => setDesignPreset("compound-gearbox")}
          type="button"
        >
          Compound train
        </button>
        <button
          className={`design-option ${designPreset === "idler-transfer" ? "active" : ""}`}
          onClick={() => setDesignPreset("idler-transfer")}
          type="button"
        >
          Idler transfer
        </button>
      </div>
      <textarea
        className="prompt-area"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        spellCheck={false}
      />

      <div className="field-label">Parameters</div>
      <div className="params-row">
        <label className="param">
          <span className="cap">module</span>
          <input value={params.module} readOnly />
        </label>
        <label className="param">
          <span className="cap">teeth A</span>
          <input value={params.teethA} readOnly />
        </label>
        <label className="param">
          <span className="cap">teeth B</span>
          <input value={params.teethB} readOnly />
        </label>
      </div>
      {hasGearC && (
        <div className="params-row" style={{ marginTop: 8 }}>
          <label className="param">
            <span className="cap">teeth C</span>
            <input value={params.teethC} readOnly />
          </label>
          {isCompound && (
            <label className="param">
              <span className="cap">teeth D</span>
              <input value={params.teethD} readOnly />
            </label>
          )}
          <label className="param">
            <span className="cap">shafts</span>
            <input value="3" readOnly />
          </label>
        </div>
      )}

      <div className="field-label">Pipeline</div>
      <p style={{ color: "var(--text-dim)", fontSize: 12, lineHeight: 1.6, margin: 0 }}>
        Director → Layout → {partAgentCount} Part Agents → Simulation → Validation → Repair.
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
