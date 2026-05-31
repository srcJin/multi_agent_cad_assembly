import { describe, it, expect } from "vitest";
import { createEmptyState } from "../src/factory";
import type { Part } from "../src/assemblyState";

describe("assembly state", () => {
  it("createEmptyState yields empty collections and version 0", () => {
    const s = createEmptyState("cube-gearbox", "make a gearbox");
    expect(s.parts).toEqual([]);
    expect(s.timeline).toEqual([]);
    expect(s.version).toBe(0);
    expect(s.validation.passed).toBe(false);
  });

  it("a Part carries both drawing and simulation representations", () => {
    const part: Part = {
      id: "gearA",
      type: "gear",
      ownerAgent: "GearADrawingAgent",
      drawing: { center: [0, 0], params: { teeth: 20, module: 2 }, outline: null },
      simulation: { center: [0, 0], radius: 20, shaftId: "shaftA", bodyKind: "dynamic" },
      status: "unknown",
      validationStatus: "unknown",
      lastModifiedBy: null,
    };
    expect(part.simulation.radius).toBe(20);
  });
});
