import { useStore } from "../lib/store";
import { validationItemsAtStep } from "../lib/stepPreview";

export function ValidationView() {
  const { assembly, previewStep } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const v = assembly.validation;
  const items = validationItemsAtStep(assembly, previewStep);
  const hasValidation = items.length > 0;
  const fails = items.filter((i) => i.severity === "fail").length;

  return (
    <div>
      <div className={`banner ${hasValidation && v.passed ? "ok" : "fail"}`}>
        {!hasValidation
          ? "Validation has not run at this preview step"
          : v.passed ? "✓ Validation passed — all checks green" : `✕ Validation failed — ${fails} check${fails === 1 ? "" : "s"} need repair`}
      </div>
      <ul className="vlist">
        {items.map((it) => (
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
