import { useStore } from "../lib/store";

export function TimelineView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  return (
    <ol style={{ listStyle: "none", padding: 0 }}>
      {assembly.timeline.map((e, i) => (
        <li key={i} data-testid="timeline-row" style={{ padding: 8, borderBottom: "1px solid #eee", color: e.status === "fail" ? "#e0533d" : "#222" }}>
          <strong>{e.step}. {e.agent}</strong> — {e.action}{e.tool ? <em> ({e.tool})</em> : null}{e.affectedParts.length ? <span> · {e.affectedParts.join(", ")}</span> : null}
        </li>
      ))}
    </ol>
  );
}
