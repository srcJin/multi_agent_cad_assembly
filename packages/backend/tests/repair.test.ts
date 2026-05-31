import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";
import { runPartDrawingAgents } from "../src/agents/partDrawing";
import { runSimulationAgent } from "../src/agents/simulation";
import { runValidationAgent } from "../src/agents/validation";
import { runRepairCoordinator } from "../src/agents/repair";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };
function failed() {
  let s = runDirector(createEmptyState("g", "g"), ctx).state;
  s = runLayoutPreview(s, ctx).state;
  s = runPartDrawingAgents(s, ctx).state;
  s = runSimulationAgent(s, ctx).state;
  const gA = getPart(s, "gearA")!;
  gA.drawing.center = [gA.drawing.center[0] - 15, 0];
  gA.simulation.center = [...gA.drawing.center];
  s = runValidationAgent(s, ctx).state;
  expect(s.validation.passed).toBe(false);
  return s;
}

describe("repair", () => {
  it("records repair history routed to a responsible agent", () => {
    const { state } = runRepairCoordinator(failed(), ctx);
    expect(state.repairHistory.length).toBeGreaterThanOrEqual(1);
    expect(state.repairHistory[0].routedTo).toBe("LayoutPreviewAgent");
  });

  it("re-derivation fixes the assembly so re-validation passes", () => {
    let { state } = runRepairCoordinator(failed(), ctx);
    state = runValidationAgent(state, ctx).state;
    expect(state.validation.passed).toBe(true);
  });
});
