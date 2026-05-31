import type { AssemblyState, TimelineEvent } from "@cad/shared";
import { runLayoutPreview } from "./layoutPreview";
import { runPartDrawingAgents } from "./partDrawing";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

const ROUTING: Record<string, string> = {
  gear_center_distance: "LayoutPreviewAgent",
  shaft_alignment: "ShaftADrawingAgent",
  gear_box_clearance: "GearADrawingAgent",
  drawing_simulation_consistency: "SimulationAgent",
};

export function runRepairCoordinator(state: AssemblyState, ctx: AgentContext): AgentResult {
  const fails = state.validation.items.filter((i) => i.severity === "fail");
  const events: TimelineEvent[] = [];

  for (const fail of fails) {
    const routedTo = fail.responsibleAgent ?? ROUTING[fail.check] ?? "DirectorAgent";
    // Repair strategy: re-run layout (canonical centers), then re-draw all parts so
    // every downstream representation is re-derived from the single source of truth.
    runLayoutPreview(state, ctx);
    runPartDrawingAgents(state, ctx);

    const note = `Validation issue "${fail.message}" routed to ${routedTo}; re-derived layout + drawings, will re-validate.`;
    state.repairHistory.push({ issueId: fail.id, routedTo, before: { check: fail.check, message: fail.message }, after: { action: "re-layout + re-draw" }, note });

    const ag = state.agents.find((a) => a.name === routedTo);
    if (ag) ag.status = "repaired";

    recordToolCall(state, { tool: "repair", agent: "RepairCoordinator", inputSummary: fail.check, outputSummary: `routed to ${routedTo}` });
    events.push({ step: ctx.step, agent: "RepairCoordinator", action: `routed '${fail.check}' to ${routedTo}`, tool: "repair", inputSummary: fail.check, outputSummary: note.slice(0, 60), status: "ok", affectedParts: fail.parts });
  }

  return { state, events };
}
