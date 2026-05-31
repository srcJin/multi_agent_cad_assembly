import { useStore } from "../lib/store";

export function ValidationView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const v = assembly.validation;
  const fails = v.items.filter((i) => i.severity === "fail").length;

  return (
    <div>
      <div className={`banner ${v.passed ? "ok" : "fail"}`}>
        {v.passed ? "✓ Validation passed — all checks green" : `✕ Validation failed — ${fails} check${fails === 1 ? "" : "s"} need repair`}
      </div>
      <ul className="vlist">
        {v.items.map((it) => (
          <li key={it.id} className={`vitem ${it.severity}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span className="check">{it.check}</span>
              <span className={`sev ${it.severity}`}>{it.severity}</span>
            </div>
            <div className="msg">{it.message}</div>
            {it.responsibleAgent ? <div className="route">→ routed to {it.responsibleAgent}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
