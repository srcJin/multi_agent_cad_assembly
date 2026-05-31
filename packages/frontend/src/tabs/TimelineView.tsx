import { useStore } from "../lib/store";

export function TimelineView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  return (
    <ol className="timeline">
      {assembly.timeline.map((e, i) => (
        <li key={i} data-testid="timeline-row" className={`tl-row ${e.status === "fail" ? "fail" : ""}`}>
          <span className="step">{e.step}</span>
          <span>
            <span className="agent">{e.agent}</span>{" "}
            <span className="action">— {e.action}</span>
            {e.affectedParts.length ? (
              <div style={{ marginTop: 4, display: "flex", gap: 5, flexWrap: "wrap" }}>
                {e.affectedParts.map((p) => <span key={p} className="tag">{p}</span>)}
              </div>
            ) : null}
          </span>
          {e.tool ? <span className="tool">{e.tool}</span> : <span />}
        </li>
      ))}
    </ol>
  );
}
