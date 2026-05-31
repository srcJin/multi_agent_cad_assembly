import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";

const ctx = { step: 1, params: { module: 2, teethA: 20, teethB: 20 } };
const seeded = () => runDirector(createEmptyState("g", "g"), { ...ctx, step: 0 }).state;

describe("layout", () => {
  it("sets gear centers and center distance (40 for two m2 z20 gears)", () => {
    const { state } = runLayoutPreview(seeded(), ctx);
    expect(state.layout.gearCenters.gearA).toBeDefined();
    expect(Math.abs(state.layout.centerDistance - 40)).toBeLessThan(1e-6);
  });

  it("box is larger than the center distance", () => {
    const { state } = runLayoutPreview(seeded(), ctx);
    expect(state.layout.boxSize[0]).toBeGreaterThan(state.layout.centerDistance);
  });

  it("writes layout centers into both part representations", () => {
    const { state } = runLayoutPreview(seeded(), ctx);
    const gA = getPart(state, "gearA")!;
    expect(gA.drawing.center).toEqual(state.layout.gearCenters.gearA);
    expect(gA.simulation.center).toEqual(state.layout.gearCenters.gearA);
  });
});
