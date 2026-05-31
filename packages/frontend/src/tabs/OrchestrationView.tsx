import ReactFlow, { Background, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import type { AgentState } from "@cad/shared";
import { useStore } from "../lib/store";

const STATUS_COLOR: Record<string, string> = { idle: "#bbb", planning: "#e8b339", running: "#3d6be0", waiting: "#9b59b6", completed: "#37a169", failed: "#e0533d", repaired: "#1e9e8a", skipped: "#888" };
const ORDER = ["DirectorAgent","LayoutPreviewAgent","BoxDrawingAgent","GearADrawingAgent","GearBDrawingAgent","ShaftADrawingAgent","ShaftBDrawingAgent","LidDrawingAgent","SimulationAgent","ValidationAgent","RepairCoordinator"];

export function agentsToNodes(agents: AgentState[]): Node[] {
  return agents.map((a) => {
    const idx = ORDER.indexOf(a.name);
    const col = idx < 0 ? 0 : idx % 4, row = idx < 0 ? 0 : Math.floor(idx / 4);
    return { id: a.name, position: { x: col * 200, y: row * 110 }, data: { label: `${a.name}\n[${a.status}]`, status: a.status }, style: { border: `2px solid ${STATUS_COLOR[a.status] ?? "#bbb"}`, borderRadius: 8, padding: 6, fontSize: 11, whiteSpace: "pre-line", width: 160 } };
  });
}

function pipelineEdges(agents: AgentState[]): Edge[] {
  const present = new Set(agents.map((a) => a.name));
  const seq = ORDER.filter((n) => present.has(n));
  const edges: Edge[] = [];
  for (let i = 0; i < seq.length - 1; i++) edges.push({ id: `${seq[i]}-${seq[i + 1]}`, source: seq[i], target: seq[i + 1] });
  for (const a of agents) if (a.status === "repaired") edges.push({ id: `repair-${a.name}`, source: "RepairCoordinator", target: a.name, animated: true, style: { stroke: "#e0533d" }, label: "repair" });
  return edges;
}

export function OrchestrationView() {
  const { assembly } = useStore();
  if (!assembly) return <p>No assembly.</p>;
  return (
    <div style={{ height: 460 }}>
      <ReactFlow nodes={agentsToNodes(assembly.agents)} edges={pipelineEdges(assembly.agents)} fitView><Background /></ReactFlow>
    </div>
  );
}
