import type { AssemblyState, Point, ValidationItem } from "@cad/shared";
import { getPart } from "@cad/shared";
import { pitchRadius, outerRadius } from "../geometry/gearMath";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function runValidationAgent(state: AssemblyState, ctx: AgentContext): AgentResult {
  const items: ValidationItem[] = [];
  const { module } = ctx.params;
  const gA = getPart(state, "gearA"), gB = getPart(state, "gearB");

  if (gA && gB) {
    const actual = dist(gA.drawing.center, gB.drawing.center);
    const expected = pitchRadius(module, Number(gA.drawing.params.teeth ?? 20)) + pitchRadius(module, Number(gB.drawing.params.teeth ?? 20));
    const pass = Math.abs(actual - expected) <= 0.5;
    items.push({ id: "v-mesh", check: "gear_center_distance", severity: pass ? "pass" : "fail", message: `center distance ${actual.toFixed(1)} vs expected ${expected.toFixed(1)}`, parts: ["gearA", "gearB"], responsibleAgent: pass ? null : "LayoutPreviewAgent" });
  }

  for (const [g, sh] of [["gearA", "shaftA"], ["gearB", "shaftB"]] as const) {
    const gear = getPart(state, g), shaft = getPart(state, sh);
    if (gear && shaft) {
      const off = dist(gear.drawing.center, shaft.drawing.center);
      const pass = off <= 0.1;
      items.push({ id: `v-coax-${g}`, check: "shaft_alignment", severity: pass ? "pass" : "fail", message: `${g} vs ${sh} offset ${off.toFixed(2)}`, parts: [g, sh], responsibleAgent: pass ? null : `Shaft${g.slice(-1)}DrawingAgent` });
    }
  }

  const box = getPart(state, "box");
  if (box) {
    const [w, h] = state.layout.boxSize;
    const wall = state.layout.wallThickness;
    const innerHw = w / 2 - wall, innerHh = h / 2 - wall;
    for (const g of ["gearA", "gearB"]) {
      const gear = getPart(state, g);
      if (gear) {
        const r = outerRadius(module, Number(gear.drawing.params.teeth ?? 20));
        const [cx, cy] = gear.drawing.center;
        const fits = Math.abs(cx) + r <= innerHw && Math.abs(cy) + r <= innerHh;
        items.push({ id: `v-contain-${g}`, check: "gear_box_clearance", severity: fits ? "pass" : "fail", message: `${g} ${fits ? "fits" : "collides with box wall"}`, parts: [g, "box"], responsibleAgent: fits ? null : g === "gearA" ? "GearADrawingAgent" : "GearBDrawingAgent" });
      }
    }
  }

  for (const g of ["gearA", "gearB"]) {
    const gear = getPart(state, g);
    if (gear) {
      const off = dist(gear.drawing.center, gear.simulation.center);
      const pass = off <= 0.01;
      items.push({ id: `v-consist-${g}`, check: "drawing_simulation_consistency", severity: pass ? "pass" : "fail", message: `${g} drawing/sim center offset ${off.toFixed(2)}`, parts: [g], responsibleAgent: pass ? null : "SimulationAgent" });
    }
  }

  const passed = items.every((i) => i.severity !== "fail");
  state.validation = { items, passed };
  for (const c of state.constraints) c.status = "ok";
  for (const i of items) if (i.severity === "fail") for (const pid of i.parts) { const p = getPart(state, pid); if (p) p.validationStatus = "failed"; }

  const ag = state.agents.find((a) => a.name === "ValidationAgent");
  if (ag) ag.status = passed ? "completed" : "failed";

  recordToolCall(state, { tool: "run_validation", agent: "ValidationAgent", inputSummary: "assembly", outputSummary: `${passed ? "PASS" : "FAIL"} (${items.length} checks)`, status: passed ? "ok" : "fail" });

  return {
    state,
    events: [{ step: ctx.step, agent: "ValidationAgent", action: "validated assembly", tool: "run_validation", inputSummary: "", outputSummary: passed ? "passed" : "failed", status: passed ? "ok" : "fail", affectedParts: [...new Set(items.flatMap((i) => i.parts))] }],
  };
}
