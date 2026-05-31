import { describe, it, expect } from "vitest";
import { generateGearOutline } from "../src/geometry/gearGeom";
import { outerRadius } from "../src/geometry/gearMath";

describe("JSCAD gear outline", () => {
  it("returns a non-empty closed polygon of points", () => {
    const pts = generateGearOutline({ teeth: 12, module: 2, pressureAngle: 20, center: [0, 0], bore: 6 });
    expect(pts.length).toBeGreaterThan(12);
    expect(pts[0]).toEqual(pts[pts.length - 1]); // closed
  });

  it("all points lie within the outer radius (+epsilon)", () => {
    const teeth = 20, module = 2;
    const pts = generateGearOutline({ teeth, module, pressureAngle: 20, center: [0, 0], bore: 6 });
    const rOuter = outerRadius(module, teeth);
    for (const [x, y] of pts) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(rOuter + 1e-6);
    }
  });

  it("respects center offset", () => {
    const pts = generateGearOutline({ teeth: 12, module: 2, pressureAngle: 20, center: [100, 50], bore: 6 });
    const cx = pts.slice(0, -1).reduce((s, p) => s + p[0], 0) / (pts.length - 1);
    const cy = pts.slice(0, -1).reduce((s, p) => s + p[1], 0) / (pts.length - 1);
    expect(Math.abs(cx - 100)).toBeLessThan(1.5);
    expect(Math.abs(cy - 50)).toBeLessThan(1.5);
  });
});
