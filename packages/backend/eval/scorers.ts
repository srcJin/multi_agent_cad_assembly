import type { AssemblyState, Point } from "@cad/shared";
import { getPart } from "@cad/shared";

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function validationPass({ modelOutput }: { modelOutput: AssemblyState }): boolean {
  return modelOutput.validation.passed === true;
}

export function repairRounds({ modelOutput }: { modelOutput: AssemblyState }): number {
  return modelOutput.repairHistory.length;
}

export function centerDistanceError({ modelOutput }: { modelOutput: AssemblyState }): number {
  const gA = getPart(modelOutput, "gearA"), gB = getPart(modelOutput, "gearB");
  if (!gA || !gB) return Number.POSITIVE_INFINITY;
  const actual = dist(gA.drawing.center, gB.drawing.center);
  const expected = modelOutput.layout.centerDistance;
  return Math.abs(actual - expected);
}

export function crossViewConsistency({ modelOutput }: { modelOutput: AssemblyState }): boolean {
  return ["gearA", "gearB"].every((id) => {
    const p = getPart(modelOutput, id);
    return p ? dist(p.drawing.center, p.simulation.center) <= 0.01 : false;
  });
}

export function clearanceOk({ modelOutput }: { modelOutput: AssemblyState }): boolean {
  return !modelOutput.validation.items.some((i) => i.check === "gear_box_clearance" && i.severity === "fail");
}
