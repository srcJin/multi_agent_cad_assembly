import { describe, it, expect } from "vitest";
import { buildWorld } from "../src/simulation/planckWorld";

const assembly = {
  parts: [
    { id: "box", type: "box", simulation: { center: [0, 0], radius: 60, bodyKind: "static" } },
    { id: "gearA", type: "gear", simulation: { center: [-20, 0], radius: 20, bodyKind: "dynamic", shaftId: "shaftA" } },
    { id: "gearB", type: "gear", simulation: { center: [20, 0], radius: 20, bodyKind: "dynamic", shaftId: "shaftB" } },
    { id: "shaftA", type: "shaft", simulation: { center: [-20, 0], radius: 3, bodyKind: "static" } },
    { id: "shaftB", type: "shaft", simulation: { center: [20, 0], radius: 3, bodyKind: "static" } },
  ],
} as any;

describe("buildWorld", () => {
  it("creates one body per part", () => {
    expect(Object.keys(buildWorld(assembly).bodies).length).toBe(5);
  });
  it("gear dynamic, box static", () => {
    const { bodies } = buildWorld(assembly);
    expect(bodies.gearA.isDynamic()).toBe(true);
    expect(bodies.box.isStatic()).toBe(true);
  });
  it("steps and gearA rotates", () => {
    const { world, bodies } = buildWorld(assembly);
    const before = bodies.gearA.getAngle();
    for (let i = 0; i < 30; i++) world.step(1 / 60);
    expect(bodies.gearA.getAngle()).not.toBe(before);
  });
});
