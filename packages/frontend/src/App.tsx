import { useStore, type TabId } from "./lib/store";
import { runWorkflow, repairOnce, resetProject } from "./lib/api";
import { PromptPanel } from "./components/PromptPanel";
import { StatusPanel } from "./components/StatusPanel";
import { DrawingView } from "./tabs/DrawingView";
import { SimulationView } from "./tabs/SimulationView";
import { OrchestrationView } from "./tabs/OrchestrationView";
import { TimelineView } from "./tabs/TimelineView";
import { ValidationView } from "./tabs/ValidationView";
import { StateExportView } from "./tabs/StateExportView";

const TABS: { id: TabId; label: string }[] = [
  { id: "drawing", label: "Drawing" },
  { id: "simulation", label: "Simulation" },
  { id: "timeline", label: "Timeline" },
  { id: "validation", label: "Validation" },
  { id: "state", label: "State" },
];

export default function App() {
  const {
    activeTab, setTab, assembly, loading, prompt, designPreset,
    setAssembly, setLoading, setPlaying, reset,
  } = useStore();

  const run = async () => {
    setLoading(true);
    setPlaying(false);
    try {
      const next = await runWorkflow(prompt, designPreset, true);
      setAssembly(next);
      setTab("drawing");
    } finally {
      setLoading(false);
    }
  };

  const repair = async () => {
    setLoading(true);
    try {
      setAssembly(await repairOnce(designPreset));
      setTab("validation");
    } finally {
      setLoading(false);
    }
  };

  const animate = () => {
    setTab("simulation");
    setPlaying(true);
  };

  const doReset = async () => {
    await resetProject();
    reset();
  };

  const passed = assembly?.validation.passed;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">⚙</span>
          <span>AssemblyCAD&nbsp;AI</span>
          <span className="sub">· agent-controlled 2D CAD</span>
        </div>

        {assembly && (
          <span className={`pill ${passed ? "ok" : "fail"}`}>
            <span className="dot" style={{ background: passed ? "var(--ok)" : "var(--fail)" }} />
            {passed ? "Validation passed" : "Validation failed"}
          </span>
        )}

        <div className="actions">
          <button className="btn btn-primary btn-lg" onClick={run} disabled={loading}>
            {loading ? <span className="spin" /> : "▶"} Run Workflow
          </button>
          <button className="btn btn-accent" onClick={animate} disabled={!assembly || loading}>
            ✦ Animate
          </button>
          <button className="btn" onClick={repair} disabled={!assembly || loading}>
            ✦ Repair Once
          </button>
          <button className="btn btn-ghost btn-danger" onClick={doReset} disabled={loading}>
            Reset
          </button>
        </div>
      </header>

      <div className="body">
        <aside className="pane-left">
          <PromptPanel />
        </aside>

        <main className="pane-main">
          <nav className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <section className="tab-body">
            {assembly ? (
              <div className="demo-workspace">
                <div className="result-panel">
                  {activeTab === "drawing" && <DrawingView />}
                  {activeTab === "simulation" && <SimulationView />}
                  {activeTab === "timeline" && <TimelineView />}
                  {activeTab === "validation" && <ValidationView />}
                  {activeTab === "state" && <StateExportView />}
                </div>
                <aside className="orchestration-panel">
                  <OrchestrationView />
                </aside>
              </div>
            ) : (
              <div className="empty">
                <div>
                  <div className="big">No assembly yet</div>
                  <div>Click <strong>Run Workflow</strong> to generate the selected design.</div>
                </div>
              </div>
            )}
          </section>
        </main>

        <aside className="pane-right">
          <StatusPanel />
        </aside>
      </div>
    </div>
  );
}
