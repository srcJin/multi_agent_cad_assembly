import { useStore } from "../lib/store";

export function StateExportView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const download = () => {
    const blob = new Blob([JSON.stringify(assembly, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${assembly.projectName}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-primary" onClick={download}>⭳ Export JSON</button>
        {assembly.weaveTraceUrl ? (
          <a className="weave-link" href={assembly.weaveTraceUrl} target="_blank" rel="noreferrer">
            🍩 View in Weave ↗
          </a>
        ) : (
          <span className="sim-hint">Set WEAVE_ENABLED=1 + WANDB_API_KEY for a live trace link</span>
        )}
      </div>
      <pre className="code-block">{JSON.stringify(assembly, null, 2)}</pre>
    </div>
  );
}
