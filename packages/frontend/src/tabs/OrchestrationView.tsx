import { useStore } from "../lib/store";
import { buildOrchestrationStages, type OrchestrationStage } from "../lib/orchestrationStages";

const STATUS_COLOR: Record<string, string> = {
  idle: "#8b949e",
  planning: "#d29922",
  running: "#6e8bff",
  waiting: "#9b59b6",
  completed: "#3fb950",
  failed: "#f85149",
  repaired: "#38d6c8",
  skipped: "#586069",
  ok: "#3fb950",
  fail: "#f85149",
};

function clampIndex(index: number, stages: OrchestrationStage[]): number {
  return Math.max(0, Math.min(index, stages.length - 1));
}

function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? "#8b949e";
}

function AgentCard({ agent }: { agent: OrchestrationStage["agents"][number] }) {
  const parts = agent.affectedParts.length ? agent.affectedParts : agent.owns;

  return (
    <article className="orch-agent-card" style={{ borderLeftColor: statusColor(agent.status) }}>
      <div className="orch-agent-head">
        <span className="orch-agent-name">{agent.name}</span>
        <span className="orch-status" style={{ color: statusColor(agent.status) }}>{agent.status}</span>
      </div>
      <div className="orch-agent-role">{agent.role}</div>
      <div className="orch-action">{agent.action}</div>
      <div className="orch-meta-row">
        {agent.tool ? <span className="orch-tool">{agent.tool}</span> : null}
        {parts.map((part) => <span key={part} className="tag">{part}</span>)}
      </div>
    </article>
  );
}

export function OrchestrationView() {
  const { assembly, previewStep, setPreviewStep } = useStore();
  if (!assembly) return <p>No assembly.</p>;

  const stages = buildOrchestrationStages(assembly.timeline, assembly.agents);
  const selectedIndex = previewStep === null ? stages.length : stages.findIndex((stage) => stage.step === previewStep);
  const selectedLabel = previewStep === null ? "Final result" : `Step ${previewStep}`;
  const canGoBack = stages.length > 0 && selectedIndex > 0;
  const canGoForward = stages.length > 0 && selectedIndex < stages.length;

  const moveBy = (delta: number) => {
    if (!stages.length) return;
    if (previewStep === null) {
      setPreviewStep(stages[stages.length - 1].step);
      return;
    }
    const current = stages.findIndex((stage) => stage.step === previewStep);
    const next = current + delta;
    if (next >= stages.length) setPreviewStep(null);
    else setPreviewStep(stages[clampIndex(next, stages)].step);
  };

  return (
    <div className="orch-frame">
      <div className="orch-controls">
        <div>
          <div className="orch-kicker">Orchestration</div>
          <div className="orch-current">{selectedLabel}</div>
        </div>
        <div className="orch-buttons">
          <button className="btn btn-ghost" onClick={() => setPreviewStep(stages[0]?.step ?? null)} disabled={!stages.length}>Start</button>
          <button className="btn btn-ghost" onClick={() => moveBy(-1)} disabled={!canGoBack}>Prev</button>
          <button className="btn btn-ghost" onClick={() => moveBy(1)} disabled={!canGoForward}>Next</button>
          <button className="btn btn-ghost" onClick={() => setPreviewStep(null)}>Final</button>
        </div>
      </div>
      <div className="orch-flow" aria-label="Agent orchestration flow">
        {stages.map((stage) => (
          <section
            key={stage.step}
            className={`orch-stage ${stage.isDispatch ? "dispatch" : ""} ${stage.failed ? "fail" : ""} ${previewStep === stage.step ? "active" : ""}`}
            data-testid="orch-stage"
          >
            <button className="orch-marker" onClick={() => setPreviewStep(stage.step)} aria-label={`Preview step ${stage.step}`}>
              <span>{stage.step}</span>
            </button>
            <div className="orch-stage-body">
              <div className="orch-stage-title">
                <span>{stage.title}</span>
                {stage.isDispatch ? <span className="orch-dispatch-count">parallel</span> : null}
              </div>
              <div className={stage.isDispatch ? "orch-agent-grid" : "orch-agent-stack"}>
                {stage.agents.map((agent) => <AgentCard key={agent.name} agent={agent} />)}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
