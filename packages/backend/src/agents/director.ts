import type { AssemblyState, Part, PartType, AgentState } from "@cad/shared";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

const PART_ROSTER: ReadonlyArray<[string, PartType, string]> = [
  ["box", "box", "BoxDrawingAgent"],
  ["gearA", "gear", "GearADrawingAgent"],
  ["gearB", "gear", "GearBDrawingAgent"],
  ["shaftA", "shaft", "ShaftADrawingAgent"],
  ["shaftB", "shaft", "ShaftBDrawingAgent"],
  ["lid", "lid", "LidDrawingAgent"],
];

export const AGENT_ROSTER: ReadonlyArray<[string, string]> = [
  ["DirectorAgent", "Director"],
  ["LayoutPreviewAgent", "Layout"],
  ["BoxDrawingAgent", "Part:box"],
  ["GearADrawingAgent", "Part:gearA"],
  ["GearBDrawingAgent", "Part:gearB"],
  ["ShaftADrawingAgent", "Part:shaftA"],
  ["ShaftBDrawingAgent", "Part:shaftB"],
  ["LidDrawingAgent", "Part:lid"],
  ["SimulationAgent", "Simulation"],
  ["ValidationAgent", "Validation"],
  ["RepairCoordinator", "Repair"],
];

function emptyPart(id: string, type: PartType, owner: string): Part {
  return {
    id, type, ownerAgent: owner,
    drawing: { center: [0, 0], params: {}, outline: null },
    simulation: { center: [0, 0], radius: 0, shaftId: null, bodyKind: "static" },
    status: "unknown", validationStatus: "unknown", lastModifiedBy: null,
  };
}

export function runDirector(state: AssemblyState, ctx: AgentContext): AgentResult {
  state.designIntent = "2D cube gearbox: two meshing gears on fixed shafts inside a box, no collision.";
  const partIds = PART_ROSTER.map(([id]) => id);
  state.planText =
    `Design intent: build a 2D cube gearbox from "${state.userPrompt}". ` +
    `Decompose into [${partIds.join(", ")}], lay out two meshing gears on fixed shafts inside a box ` +
    `with clearance, then validate meshing, coaxial shafts, containment and drawing/simulation consistency.`;

  state.parts = PART_ROSTER.map(([id, type, owner]) => emptyPart(id, type, owner));
  state.agents = AGENT_ROSTER.map<AgentState>(([name, role]) => ({
    name, role, status: "idle",
    owns: PART_ROSTER.filter(([, , owner]) => owner === name).map(([id]) => id),
  }));
  const dir = state.agents.find((a) => a.name === "DirectorAgent");
  if (dir) dir.status = "completed";

  recordToolCall(state, { tool: "generate_plan", agent: "DirectorAgent", inputSummary: state.userPrompt.slice(0, 40), outputSummary: `${partIds.length} parts` });

  return {
    state,
    events: [{
      step: ctx.step, agent: "DirectorAgent", action: "generated design plan",
      tool: "generate_plan", inputSummary: "user prompt",
      outputSummary: `intent + plan + ${partIds.length} parts`, status: "ok", affectedParts: partIds,
    }],
  };
}
