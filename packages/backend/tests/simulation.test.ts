import { describe, it, expect } from "vitest";
import { createEmptyState } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";
import { runPartDrawingAgents } from "../src/agents/partDrawing";
import { runSimulationAgent } from "../src/agents/simulation";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };
function drawn() {
  let s = runDirector(createEmptyState("g", "g"), ctx).state;
  s = runLayoutPreview(s, ctx).state;
  s = runPartDrawingAgents(s, ctx).state;
  return s;
}

describe("simulation agent", () => {
  it("creates mesh, coaxial and consistency constraints", () => {
    const { state } = runSimulationAgent(drawn(), ctx);
    const types = new Set(state.constraints.map((c) => c.type));
    expect(types.has("gear_mesh")).toBe(true);
    expect(types.has("coaxial")).toBe(true);
    expect(types.has("drawing_simulation_consistency")).toBe(true);
  });

  it("mesh constraint links both gears", () => {
    const { state } = runSimulationAgent(drawn(), ctx);
    const mesh = state.constraints.find((c) => c.type === "gear_mesh")!;
    expect(new Set(mesh.parts)).toEqual(new Set(["gearA", "gearB"]));
  });
});
