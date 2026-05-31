import { describe, it, expect } from "vitest";
import { pitchRadius, outerRadius, rootRadius, centerDistance } from "../src/geometry/gearMath";

describe("gear math", () => {
  it("pitch radius = module * teeth / 2", () => expect(pitchRadius(2, 20)).toBe(20));
  it("outer radius = pitch + module", () => expect(outerRadius(2, 20)).toBe(22));
  it("root radius = pitch - 1.25*module", () => expect(rootRadius(2, 20)).toBe(17.5));
  it("center distance = sum of pitch radii", () => expect(centerDistance(2, 20, 30)).toBe(50));
});
