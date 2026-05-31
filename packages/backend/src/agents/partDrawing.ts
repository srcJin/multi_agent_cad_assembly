import type { AssemblyState, Part, Point, TimelineEvent } from "@cad/shared";
import { getPart } from "@cad/shared";
import { pitchRadius } from "../geometry/gearMath";
import { generateGearOutline } from "../geometry/gearGeom";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";
import { gearSpecFor } from "./design";

function rectOutline(cx: number, cy: number, w: number, h: number): Point[] {
  const hw = w / 2, hh = h / 2;
  const pts: Point[] = [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]];
  return [...pts, pts[0]];
}

function drawOne(state: AssemblyState, agentName: string, partId: string, ctx: AgentContext): TimelineEvent {
  const part = getPart(state, partId) as Part;
  const { module } = ctx.params;
  let tool = "";

  if (part.type === "gear") {
    const spec = gearSpecFor(ctx.params, state.userPrompt, partId);
    const teeth = spec?.teeth ?? (partId === "gearA" ? ctx.params.teethA : ctx.params.teethB);
    const pa = ctx.params.pressureAngle ?? 20;
    const bore = ctx.params.bore ?? 6;
    const [cx, cy] = part.drawing.center;
    part.drawing.params = { teeth, module, pressureAngle: pa, bore };
    part.drawing.outline = generateGearOutline({ teeth, module, pressureAngle: pa, center: [cx, cy], bore });
    part.simulation.radius = pitchRadius(module, teeth);
    part.simulation.shaftId = spec?.shaftId ?? (partId === "gearA" ? "shaftA" : "shaftB");
    part.simulation.bodyKind = "dynamic";
    tool = "create_gear";
  } else if (part.type === "box") {
    const [w, h] = state.layout.boxSize;
    part.drawing.center = [0, 0]; part.simulation.center = [0, 0];
    part.drawing.params = { width: w, height: h, wall: state.layout.wallThickness };
    part.drawing.outline = rectOutline(0, 0, w, h);
    part.simulation.radius = Math.max(w, h) / 2;
    part.simulation.bodyKind = "static";
    tool = "create_box";
  } else if (part.type === "shaft") {
    const [cx, cy] = part.drawing.center;
    const d = ctx.params.shaftDiameter ?? 6;
    part.drawing.params = { diameter: d };
    part.drawing.outline = rectOutline(cx, cy, d, d);
    part.simulation.radius = d / 2;
    part.simulation.bodyKind = "static";
    tool = "create_shaft";
  } else { // lid
    const [w, h] = state.layout.boxSize;
    part.drawing.center = [0, h / 2];
    part.drawing.params = { width: w };
    part.drawing.outline = rectOutline(0, h / 2, w, state.layout.wallThickness);
    part.simulation.radius = 0;
    part.simulation.bodyKind = "static";
    tool = "create_lid";
  }

  part.lastModifiedBy = agentName;
  part.status = "drawn";
  const ag = state.agents.find((a) => a.name === agentName);
  if (ag) ag.status = "completed";

  recordToolCall(state, { tool, agent: agentName, inputSummary: partId, outputSummary: "outline generated" });
  return { step: ctx.step, agent: agentName, action: `generated ${partId}`, tool, inputSummary: partId, outputSummary: "outline", status: "ok", affectedParts: [partId] };
}

export function runPartDrawingAgents(state: AssemblyState, ctx: AgentContext): AgentResult {
  const events = state.parts.map((part) => drawOne(state, part.ownerAgent, part.id, ctx));
  return { state, events };
}
