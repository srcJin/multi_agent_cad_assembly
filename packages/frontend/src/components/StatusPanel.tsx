import { useStore } from "../lib/store";

export function StatusPanel() {
  const { assembly } = useStore();
  if (!assembly) {
    return (
      <div className="pane-section">
        <h2 className="pane-title">Status</h2>
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No active project.</p>
      </div>
    );
  }

  const v = assembly.validation;
  const fails = v.items.filter((i) => i.severity === "fail");

  return (
    <div className="pane-section">
      <h2 className="pane-title">Assembly Status</h2>

      <div className={`banner ${v.passed ? "ok" : "fail"}`}>
        {v.passed ? "✓ Validation passed" : `✕ ${fails.length} check${fails.length === 1 ? "" : "s"} failing`}
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="k">Parts</div><div className="v">{assembly.parts.length}</div></div>
        <div className="stat"><div className="k">Constraints</div><div className="v">{assembly.constraints.length}</div></div>
        <div className="stat"><div className="k">Agents</div><div className="v">{assembly.agents.length}</div></div>
        <div className="stat"><div className="k">Steps</div><div className="v">{assembly.timeline.length}</div></div>
        <div className="stat"><div className="k">Repairs</div><div className="v">{assembly.repairHistory.length}</div></div>
        <div className="stat"><div className="k">Version</div><div className="v">{assembly.version}</div></div>
      </div>

      <h2 className="pane-title" style={{ marginTop: 20 }}>Checks</h2>
      <ul className="vlist">
        {v.items.map((it) => (
          <li key={it.id} className={`vitem ${it.severity}`} style={{ padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{it.check}</span>
              <span className={`sev ${it.severity}`}>{it.severity}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
