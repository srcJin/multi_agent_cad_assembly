import { useStore, type TabId } from "./lib/store";
import { PromptPanel } from "./components/PromptPanel";

const TABS: TabId[] = ["drawing", "simulation", "orchestration", "timeline", "validation", "state"];

export default function App() {
  const { activeTab, setTab, assembly } = useStore();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 320px", height: "100vh", fontFamily: "system-ui" }}>
      <aside style={{ borderRight: "1px solid #ddd", padding: 12 }}><PromptPanel /></aside>
      <main style={{ display: "flex", flexDirection: "column" }}>
        <nav style={{ display: "flex", gap: 4, padding: 8, borderBottom: "1px solid #ddd" }}>
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} style={{ fontWeight: activeTab === t ? 700 : 400 }}>{t}</button>)}
        </nav>
        <section style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {assembly ? <div data-testid="active-tab">{activeTab} view</div> : <p>Run a workflow to begin.</p>}
        </section>
      </main>
      <aside style={{ borderLeft: "1px solid #ddd", padding: 12 }}><p>Status panel</p></aside>
    </div>
  );
}
