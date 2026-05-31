import { useStore } from "../lib/store";

export function StatusPanel() {
  const { assembly } = useStore();
  if (!assembly) return <p>No project.</p>;
  const fails = assembly.validation.items.filter((i) => i.severity === "fail");
  return (
    <div>
      <h4>Status: {assembly.status}</h4>
      <p>Version: {assembly.version}</p>
      <p>Parts: {assembly.parts.length} · Constraints: {assembly.constraints.length}</p>
      <p>Validation: {assembly.validation.passed ? "✅ passed" : `❌ ${fails.length} failing`}</p>
      <p>Repairs: {assembly.repairHistory.length}</p>
    </div>
  );
}
