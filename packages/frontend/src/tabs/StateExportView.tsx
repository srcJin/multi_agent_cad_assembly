import { useStore } from "../lib/store";

export function StateExportView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  const download = () => {
    const blob = new Blob([JSON.stringify(assembly, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${assembly.projectName}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div>
      {assembly.weaveTraceUrl ? <p><a href={assembly.weaveTraceUrl} target="_blank" rel="noreferrer">View in Weave ↗</a></p> : null}
      <button onClick={download}>Export JSON</button>
      <pre style={{ fontSize: 11, maxHeight: 400, overflow: "auto", background: "#f6f6f6", padding: 8 }}>{JSON.stringify(assembly, null, 2)}</pre>
    </div>
  );
}
