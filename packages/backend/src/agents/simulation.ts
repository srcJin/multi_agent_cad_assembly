import type { AssemblyState, Constraint } from "@cad/shared";
import { getPart } from "@cad/shared";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

export function runSimulationAgent(state: AssemblyState, ctx: AgentContext): AgentResult {
  const constraints: Constraint[] = [
    { id: "mesh-AB", type: "gear_mesh", parts: ["gearA", "gearB"], responsibleAgent: "LayoutPreviewAgent", tolerance: 0.5, status: "unknown" },
    { id: "coax-A", type: "coaxial", parts: ["gearA", "shaftA"], responsibleAgent: "ShaftADrawingAgent", tolerance: 0.1, status: "unknown" },
    { id: "coax-B", type: "coaxial", parts: ["gearB", "shaftB"], responsibleAgent: "ShaftBDrawingAgent", tolerance: 0.1, status: "unknown" },
    { id: "contain-A", type: "containment", parts: ["gearA", "box"], responsibleAgent: "BoxDrawingAgent", tolerance: 0, status: "unknown" },
    { id: "contain-B", type: "containment", parts: ["gearB", "box"], responsibleAgent: "BoxDrawingAgent", tolerance: 0, status: "unknown" },
    { id: "consistency", type: "drawing_simulation_consistency", parts: ["gearA", "gearB"], responsibleAgent: "SimulationAgent", tolerance: 0.01, status: "unknown" },
  ];
  state.constraints = constraints;

  for (const [g, s] of [["gearA", "shaftA"], ["gearB", "shaftB"]] as const) {
    const gear = getPart(state, g);
    if (gear) gear.simulation.shaftId = s;
  }

  const ag = state.agents.find((a) => a.name === "SimulationAgent");
  if (ag) ag.status = "completed";

  recordToolCall(state, { tool: "build_simulation", agent: "SimulationAgent", inputSummary: "parts", outputSummary: `${constraints.length} constraints` });

  return {
    state,
    events: [{ step: ctx.step, agent: "SimulationAgent", action: "built simulation model", tool: "build_simulation", inputSummary: "", outputSummary: `${constraints.length} constraints`, status: "ok", affectedParts: ["gearA", "gearB", "shaftA", "shaftB", "box"] }],
  };
}
