import type { AssemblyState, Constraint } from "@cad/shared";
import { getPart } from "@cad/shared";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";
import { resolveDesign } from "./design";

export function runSimulationAgent(state: AssemblyState, ctx: AgentContext): AgentResult {
  const design = resolveDesign(ctx.params, state.userPrompt);
  const gearIds = design.gears.map((gear) => gear.id);
  const constraints: Constraint[] = [
    ...design.meshes.map((mesh) => ({
      id: mesh.id,
      type: "gear_mesh" as const,
      parts: [...mesh.gears],
      responsibleAgent: "LayoutPreviewAgent",
      tolerance: 0.5,
      status: "unknown",
    })),
    ...design.gears.map((gear) => ({
      id: `coax-${gear.id}`,
      type: "coaxial" as const,
      parts: [gear.id, gear.shaftId],
      responsibleAgent: getPart(state, gear.shaftId)?.ownerAgent ?? "LayoutPreviewAgent",
      tolerance: 0.1,
      status: "unknown",
    })),
    ...gearIds.map((gearId) => ({
      id: `contain-${gearId}`,
      type: "containment" as const,
      parts: [gearId, "box"],
      responsibleAgent: "BoxDrawingAgent",
      tolerance: 0,
      status: "unknown",
    })),
    { id: "consistency", type: "drawing_simulation_consistency", parts: gearIds, responsibleAgent: "SimulationAgent", tolerance: 0.01, status: "unknown" },
  ];
  state.constraints = constraints;

  for (const spec of design.gears) {
    const gear = getPart(state, spec.id);
    if (gear) gear.simulation.shaftId = spec.shaftId;
  }

  const ag = state.agents.find((a) => a.name === "SimulationAgent");
  if (ag) ag.status = "completed";

  recordToolCall(state, { tool: "build_simulation", agent: "SimulationAgent", inputSummary: "parts", outputSummary: `${constraints.length} constraints` });

  return {
    state,
    events: [{ step: ctx.step, agent: "SimulationAgent", action: "built simulation model", tool: "build_simulation", inputSummary: "", outputSummary: `${constraints.length} constraints`, status: "ok", affectedParts: [...gearIds, ...new Set(design.gears.map((gear) => gear.shaftId)), "box"] }],
  };
}
