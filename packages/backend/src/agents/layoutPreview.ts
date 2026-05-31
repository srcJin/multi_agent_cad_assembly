import type { AssemblyState } from "@cad/shared";
import { getPart } from "@cad/shared";
import { centerDistance, outerRadius } from "../geometry/gearMath";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

export function runLayoutPreview(state: AssemblyState, ctx: AgentContext): AgentResult {
  const { module, teethA, teethB } = ctx.params;
  const wall = ctx.params.wallThickness ?? 5;
  const clearance = ctx.params.clearance ?? 3;
  const shaftDiameter = ctx.params.shaftDiameter ?? 6;

  const cd = centerDistance(module, teethA, teethB);
  const rA = outerRadius(module, teethA);
  const rB = outerRadius(module, teethB);

  // Lay gears side by side along X axis, centred at the origin
  const cxA = -cd / 2;
  const cxB = cd / 2;
  const cy = 0;

  const halfW = cd / 2 + Math.max(rA, rB) + clearance + wall;
  const halfH = Math.max(rA, rB) + clearance + wall;
  const boxW = halfW * 2;
  const boxH = halfH * 2;

  state.layout.boxSize = [boxW, boxH];
  state.layout.wallThickness = wall;
  state.layout.centerDistance = cd;
  state.layout.gearCenters = { gearA: [cxA, cy], gearB: [cxB, cy] };
  state.layout.shaftPositions = { shaftA: [cxA, cy], shaftB: [cxB, cy] };
  state.layout.lidPosition = [0, halfH];

  // Seed part centers so drawing agents can read them
  const seedCenter = (id: string, pt: [number, number]) => {
    const p = getPart(state, id);
    if (p) {
      p.drawing.center = pt;
      p.simulation.center = pt;
    }
  };

  seedCenter("gearA", [cxA, cy]);
  seedCenter("gearB", [cxB, cy]);
  seedCenter("shaftA", [cxA, cy]);
  seedCenter("shaftB", [cxB, cy]);
  seedCenter("box", [0, 0]);
  seedCenter("lid", [0, halfH]);

  const ag = state.agents.find((a) => a.name === "LayoutPreviewAgent");
  if (ag) ag.status = "completed";

  recordToolCall(state, {
    tool: "layout_preview",
    agent: "LayoutPreviewAgent",
    inputSummary: `module=${module} teethA=${teethA} teethB=${teethB}`,
    outputSummary: `boxSize=[${boxW.toFixed(1)},${boxH.toFixed(1)}] cd=${cd}`,
  });

  return {
    state,
    events: [{
      step: ctx.step,
      agent: "LayoutPreviewAgent",
      action: "generated layout preview",
      tool: "layout_preview",
      inputSummary: "gear params",
      outputSummary: `box ${boxW.toFixed(1)}x${boxH.toFixed(1)}, cd=${cd}`,
      status: "ok",
      affectedParts: ["box", "gearA", "gearB", "shaftA", "shaftB", "lid"],
    }],
  };
}
