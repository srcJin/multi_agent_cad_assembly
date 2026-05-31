import { useStore } from "../lib/store";
import { eventsThroughStep } from "../lib/stepPreview";

export function TimelineView() {
  const { assembly, previewStep } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const events = eventsThroughStep(assembly.timeline, previewStep);
  return (
    <ol className="timeline">
      {events.map((e, i) => (
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
