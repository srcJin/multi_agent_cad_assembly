import type { AssemblyState, Part, PartType, AgentState } from "@cad/shared";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";
import { resolveDesign } from "./design";

function emptyPart(id: string, type: PartType, owner: string): Part {
  return {
    id, type, ownerAgent: owner,
    drawing: { center: [0, 0], params: {}, outline: null },
    simulation: { center: [0, 0], radius: 0, shaftId: null, bodyKind: "static" },
    status: "unknown", validationStatus: "unknown", lastModifiedBy: null,
  };
}

export function runDirector(state: AssemblyState, ctx: AgentContext): AgentResult {
  const design = resolveDesign(ctx.params, state.userPrompt);
  state.projectName = design.projectName;
  state.designIntent = design.intent;
  const partIds = design.parts.map(([id]) => id);
  state.planText =
    `Design intent: build a ${design.label} from "${state.userPrompt}". ` +
    `Decompose into [${partIds.join(", ")}], lay out ${design.meshes.length} gear mesh${design.meshes.length === 1 ? "" : "es"} ` +
    `across ${new Set(design.gears.map((gear) => gear.shaftId)).size} fixed shafts inside a box with clearance, ` +
    `then validate meshing, coaxial shafts, containment and drawing/simulation consistency.`;

  state.parts = design.parts.map(([id, type, owner]) => emptyPart(id, type, owner));
  state.agents = design.agents.map<AgentState>(([name, role]) => ({
    name, role, status: "idle",
    owns: design.parts.filter(([, , owner]) => owner === name).map(([id]) => id),
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
