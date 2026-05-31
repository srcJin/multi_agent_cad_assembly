import { primitives, booleans, geometries, transforms } from "@jscad/modeling";
import type { Point } from "@cad/shared";
import { outerRadius, rootRadius } from "./gearMath";

const { circle, polygon } = primitives;
const { union, subtract } = booleans;
const { geom2 } = geometries;
const { translate } = transforms;

export interface GearSpec {
  teeth: number;
  module: number;
  pressureAngle: number;
  center: Point;
  bore: number;
}

// Build a 2D spur gear as a JSCAD geom2: a root-circle body unioned with
// trapezoidal teeth, minus a central bore. We own the tooth math; JSCAD owns
// the boolean composition and canonical geometry. Then extract the outline.
export function generateGearOutline(spec: GearSpec): Point[] {
  const { teeth, module, pressureAngle, center, bore } = spec;
  const rOuter = outerRadius(module, teeth);
  const rRoot = Math.max(0.5, rootRadius(module, teeth));

  const body = circle({ radius: rRoot, segments: Math.max(24, teeth * 3) });

  // tooth half-angles at root and tip (tip narrower => trapezoid, leaning per pressure angle)
  const angPitch = (2 * Math.PI) / teeth;
  const lean = (pressureAngle / 90) * (angPitch * 0.12);
  const rootHalf = angPitch * 0.28;
  const tipHalf = Math.max(0.02, rootHalf - lean);

  const teethGeoms = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * angPitch;
    const p = (r: number, da: number): Point => [r * Math.cos(a + da), r * Math.sin(a + da)];
    const toothPts: Point[] = [
      p(rRoot - 0.01, -rootHalf),
      p(rOuter, -tipHalf),
      p(rOuter, tipHalf),
      p(rRoot - 0.01, rootHalf),
    ];
    teethGeoms.push(polygon({ points: toothPts }));
  }

  let gear = union(body, ...teethGeoms);
  if (bore > 0) {
    gear = subtract(gear, circle({ radius: bore / 2, segments: 24 }));
  }
  gear = translate([center[0], center[1], 0], gear) as ReturnType<typeof union>;

  // outermost outline (the boolean may yield the bore as a second outline; take the largest)
  const outlines = geom2.toOutlines(gear as Parameters<typeof geom2.toOutlines>[0]);
  const ranked = outlines
    .map((o) => o.map((pt) => [pt[0], pt[1]] as Point))
    .sort((a, b) => boundingSpan(b) - boundingSpan(a));
  const outer = ranked[0] ?? [];
  return outer.length ? [...outer, outer[0]] : [];
}

function boundingSpan(pts: Point[]): number {
  if (!pts.length) return 0;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
}
