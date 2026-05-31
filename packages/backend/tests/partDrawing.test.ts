import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";
import { runLayoutPreview } from "../src/agents/layoutPreview";
import { runPartDrawingAgents } from "../src/agents/partDrawing";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };
function laidOut() {
  let s = runDirector(createEmptyState("g", "g"), ctx).state;
  s = runLayoutPreview(s, ctx).state;
  return s;
}

describe("part drawing agents", () => {
  it("gear agent writes outline + params and pitch-radius sim body", () => {
    const { state } = runPartDrawingAgents(laidOut(), ctx);
    const gA = getPart(state, "gearA")!;
    expect(gA.drawing.outline!.length).toBeGreaterThan(10);
    expect(gA.drawing.params.teeth).toBe(20);
    expect(Math.abs(gA.simulation.radius - 20)).toBeLessThan(1e-6);
    expect(gA.simulation.shaftId).toBe("shaftA");
  });

  it("box agent writes a 5-point rectangle outline", () => {
    const { state } = runPartDrawingAgents(laidOut(), ctx);
    expect(getPart(state, "box")!.drawing.outline!.length).toBe(5);
  });

  it("shaft body is static and smaller than the gear", () => {
    const { state } = runPartDrawingAgents(laidOut(), ctx);
    expect(getPart(state, "shaftA")!.simulation.radius).toBeLessThan(getPart(state, "gearA")!.simulation.radius);
    expect(getPart(state, "shaftA")!.simulation.bodyKind).toBe("static");
  });
});
