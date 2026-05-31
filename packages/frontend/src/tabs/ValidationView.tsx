import { useStore } from "../lib/store";

const SEV: Record<string, string> = { pass: "#37a169", warn: "#e8b339", fail: "#e0533d" };

export function ValidationView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const v = assembly.validation;
  return (
    <div>
      <h4>Validation: {v.passed ? "PASSED" : "FAILED"}</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {v.items.map((it) => (
          <li key={it.id} style={{ padding: 6, borderLeft: `4px solid ${SEV[it.severity]}`, marginBottom: 4 }}>
            <strong>{it.check}</strong> [{it.severity}] — {it.message}{it.responsibleAgent ? <em> → {it.responsibleAgent}</em> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
