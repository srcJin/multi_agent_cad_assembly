import type { AssemblyState, Point, ValidationItem } from "@cad/shared";
import { getPart } from "@cad/shared";
import { pitchRadius, outerRadius } from "../geometry/gearMath";
import { recordToolCall } from "../tools/registry";
import type { AgentContext, AgentResult } from "./types";
import { resolveDesign } from "./design";

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function runValidationAgent(state: AssemblyState, ctx: AgentContext): AgentResult {
  const items: ValidationItem[] = [];
  const design = resolveDesign(ctx.params, state.userPrompt);
  const { module } = ctx.params;

  for (const mesh of design.meshes) {
    const gearA = getPart(state, mesh.gears[0]);
    const gearB = getPart(state, mesh.gears[1]);
    if (!gearA || !gearB) continue;
    const actual = dist(gearA.drawing.center, gearB.drawing.center);
    const expected =
      pitchRadius(module, Number(gearA.drawing.params.teeth ?? 20)) +
      pitchRadius(module, Number(gearB.drawing.params.teeth ?? 20));
    const pass = Math.abs(actual - expected) <= 0.5;
    items.push({
      id: `v-${mesh.id}`,
      check: "gear_center_distance",
      severity: pass ? "pass" : "fail",
      message: `${mesh.gears.join("-")} center distance ${actual.toFixed(1)} vs expected ${expected.toFixed(1)}`,
      parts: [...mesh.gears],
      responsibleAgent: pass ? null : "LayoutPreviewAgent",
    });
  }

  for (const spec of design.gears) {
    const gear = getPart(state, spec.id), shaft = getPart(state, spec.shaftId);
    if (gear && shaft) {
      const off = dist(gear.drawing.center, shaft.drawing.center);
      const pass = off <= 0.1;
      items.push({
        id: `v-coax-${spec.id}`,
        check: "shaft_alignment",
        severity: pass ? "pass" : "fail",
        message: `${spec.id} vs ${spec.shaftId} offset ${off.toFixed(2)}`,
        parts: [spec.id, spec.shaftId],
        responsibleAgent: pass ? null : shaft.ownerAgent,
      });
    }
  }

  const box = getPart(state, "box");
  if (box) {
    const [w, h] = state.layout.boxSize;
    const wall = state.layout.wallThickness;
    const innerHw = w / 2 - wall, innerHh = h / 2 - wall;
    for (const spec of design.gears) {
      const gear = getPart(state, spec.id);
      if (gear) {
        const r = outerRadius(module, Number(gear.drawing.params.teeth ?? 20));
        const [cx, cy] = gear.drawing.center;
        const fits = Math.abs(cx) + r <= innerHw && Math.abs(cy) + r <= innerHh;
        items.push({
          id: `v-contain-${spec.id}`,
          check: "gear_box_clearance",
          severity: fits ? "pass" : "fail",
          message: `${spec.id} ${fits ? "fits" : "collides with box wall"}`,
          parts: [spec.id, "box"],
          responsibleAgent: fits ? null : gear.ownerAgent,
        });
      }
    }
  }

  for (const spec of design.gears) {
    const gear = getPart(state, spec.id);
    if (gear) {
      const off = dist(gear.drawing.center, gear.simulation.center);
      const pass = off <= 0.01;
      items.push({ id: `v-consist-${spec.id}`, check: "drawing_simulation_consistency", severity: pass ? "pass" : "fail", message: `${spec.id} drawing/sim center offset ${off.toFixed(2)}`, parts: [spec.id], responsibleAgent: pass ? null : "SimulationAgent" });
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
