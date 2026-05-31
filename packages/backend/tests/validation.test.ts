import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";
import { runPartDrawingAgents } from "../src/agents/partDrawing";
import { runSimulationAgent } from "../src/agents/simulation";
import { runValidationAgent } from "../src/agents/validation";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };
function built() {
  let s = runDirector(createEmptyState("g", "g"), ctx).state;
  s = runLayoutPreview(s, ctx).state;
  s = runPartDrawingAgents(s, ctx).state;
  s = runSimulationAgent(s, ctx).state;
  return s;
}

describe("validation", () => {
  it("passes on a consistent assembly", () => {
    const { state } = runValidationAgent(built(), ctx);
    expect(state.validation.passed).toBe(true);
    expect(state.validation.items.every((i) => i.severity !== "fail")).toBe(true);
  });

  it("detects mesh failure when a gear center is wrong, with a responsible agent", () => {
    const s = built();
    const gA = getPart(s, "gearA")!;
    gA.drawing.center = [gA.drawing.center[0] - 15, gA.drawing.center[1]];
    gA.simulation.center = [...gA.drawing.center];
    const { state } = runValidationAgent(s, ctx);
    expect(state.validation.passed).toBe(false);
    const fail = state.validation.items.find((i) => i.check === "gear_center_distance" && i.severity === "fail")!;
    expect(fail.responsibleAgent).not.toBeNull();
  });

  it("detects cross-view inconsistency", () => {
    const s = built();
    const gB = getPart(s, "gearB")!;
    gB.simulation.center = [gB.drawing.center[0] + 9, gB.drawing.center[1]];
    const { state } = runValidationAgent(s, ctx);
    expect(state.validation.items.some((i) => i.check === "drawing_simulation_consistency" && i.severity === "fail")).toBe(true);
  });
});
