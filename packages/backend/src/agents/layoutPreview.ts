import type { AssemblyState } from "@cad/shared";
import { getPart } from "@cad/shared";
import { centerDistance, outerRadius } from "../geometry/gearMath";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";
import { resolveDesign } from "./design";

export function runLayoutPreview(state: AssemblyState, ctx: AgentContext): AgentResult {
  const design = resolveDesign(ctx.params, state.userPrompt);
  const { module } = ctx.params;
  const wall = ctx.params.wallThickness ?? 5;
  const clearance = ctx.params.clearance ?? 3;

  const gears = Object.fromEntries(design.gears.map((gear) => [gear.id, gear]));
  const gearCenters: Record<string, [number, number]> = {};

  if (design.id === "compound-gearbox") {
    const cdAB = centerDistance(module, gears.gearA.teeth, gears.gearB.teeth);
    const cdCD = centerDistance(module, gears.gearC.teeth, gears.gearD.teeth);
    const angle = -Math.PI / 5;
    const b: [number, number] = [0, 0];
    const a: [number, number] = [-cdAB, 0];
    const c: [number, number] = b;
    const d: [number, number] = [b[0] + cdCD * Math.cos(angle), b[1] + cdCD * Math.sin(angle)];
    const minX = Math.min(a[0], b[0], d[0]);
    const maxX = Math.max(a[0], b[0], d[0]);
    const minY = Math.min(a[1], b[1], d[1]);
    const maxY = Math.max(a[1], b[1], d[1]);
    const dx = -(minX + maxX) / 2;
    const dy = -(minY + maxY) / 2;
    gearCenters.gearA = [a[0] + dx, a[1] + dy];
    gearCenters.gearB = [b[0] + dx, b[1] + dy];
    gearCenters.gearC = [c[0] + dx, c[1] + dy];
    gearCenters.gearD = [d[0] + dx, d[1] + dy];
  } else if (design.id === "idler-transfer") {
    const cdAB = centerDistance(module, gears.gearA.teeth, gears.gearB.teeth);
    const cdBC = centerDistance(module, gears.gearB.teeth, gears.gearC.teeth);
    const angle = Math.PI / 7;
    gearCenters.gearB = [0, 0];
    gearCenters.gearA = [-cdAB, 0];
    gearCenters.gearC = [cdBC * Math.cos(angle), cdBC * Math.sin(angle)];
  } else {
    const cd = centerDistance(module, gears.gearA.teeth, gears.gearB.teeth);
    gearCenters.gearA = [-cd / 2, 0];
    gearCenters.gearB = [cd / 2, 0];
  }

  const boundsFor = () => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const gear of design.gears) {
      const [cx, cy] = gearCenters[gear.id];
      const r = outerRadius(module, gear.teeth);
      minX = Math.min(minX, cx - r);
      maxX = Math.max(maxX, cx + r);
      minY = Math.min(minY, cy - r);
      maxY = Math.max(maxY, cy + r);
    }
    return { minX, maxX, minY, maxY };
  };

  const initialBounds = boundsFor();
  const shiftX = -(initialBounds.minX + initialBounds.maxX) / 2;
  const shiftY = -(initialBounds.minY + initialBounds.maxY) / 2;
  for (const id of Object.keys(gearCenters)) {
    gearCenters[id] = [gearCenters[id][0] + shiftX, gearCenters[id][1] + shiftY];
  }

  const shaftPositions: Record<string, [number, number]> = {};
  for (const gear of design.gears) {
    shaftPositions[gear.shaftId] = gearCenters[gear.id];
  }

  const { minX, maxX, minY, maxY } = boundsFor();
  const margin = clearance + wall;
  const boxW = maxX - minX + margin * 2;
  const boxH = maxY - minY + margin * 2;
  const halfH = boxH / 2;

  state.layout.boxSize = [boxW, boxH];
  state.layout.wallThickness = wall;
  state.layout.centerDistance = design.meshes.length
    ? centerDistance(module, gears[design.meshes[0].gears[0]].teeth, gears[design.meshes[0].gears[1]].teeth)
    : 0;
  state.layout.gearCenters = gearCenters;
  state.layout.shaftPositions = shaftPositions;
  state.layout.lidPosition = [0, halfH];

  // Seed part centers so drawing agents can read them
  const seedCenter = (id: string, pt: [number, number]) => {
    const p = getPart(state, id);
    if (p) {
      p.drawing.center = pt;
      p.simulation.center = pt;
    }
  };

  for (const gear of design.gears) seedCenter(gear.id, gearCenters[gear.id]);
  for (const [shaftId, pt] of Object.entries(shaftPositions)) seedCenter(shaftId, pt);
  seedCenter("box", [0, 0]);
  seedCenter("lid", [0, halfH]);

  const ag = state.agents.find((a) => a.name === "LayoutPreviewAgent");
  if (ag) ag.status = "completed";

  recordToolCall(state, {
    tool: "layout_preview",
    agent: "LayoutPreviewAgent",
    inputSummary: `module=${module} gears=${design.gears.map((gear) => gear.teeth).join("/")}`,
    outputSummary: `boxSize=[${boxW.toFixed(1)},${boxH.toFixed(1)}] meshes=${design.meshes.length}`,
  });

  return {
    state,
    events: [{
      step: ctx.step,
      agent: "LayoutPreviewAgent",
      action: "generated layout preview",
      tool: "layout_preview",
      inputSummary: "gear params",
      outputSummary: `box ${boxW.toFixed(1)}x${boxH.toFixed(1)}, meshes=${design.meshes.length}`,
      status: "ok",
      affectedParts: state.parts.map((part) => part.id),
    }],
  };
}
