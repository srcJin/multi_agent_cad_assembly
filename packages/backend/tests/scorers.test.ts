import { describe, it, expect } from "vitest";
import { createEmptyState } from "@cad/shared";
import { runWorkflow, runRepairOnce } from "../src/agents/orchestrator";
import { validationPass, repairRounds, centerDistanceError } from "../eval/scorers";

const params = { module: 2, teethA: 20, teethB: 20 };

describe("eval scorers", () => {
  it("validationPass reflects final validation", async () => {
    const ok = await runWorkflow("g", params);
    expect(validationPass({ modelOutput: ok })).toBe(true);
  });

  it("repairRounds counts repair history", async () => {
    let s = await runWorkflow("g", params, { seedFailure: true });
    s = await runRepairOnce(s, params);
    expect(repairRounds({ modelOutput: s })).toBeGreaterThanOrEqual(1);
  });

  it("centerDistanceError is ~0 for a passing assembly", async () => {
    const ok = await runWorkflow("g", params);
    expect(centerDistanceError({ modelOutput: ok })).toBeLessThan(0.5);
  });

  it("scorers tolerate an empty state", () => {
    expect(validationPass({ modelOutput: createEmptyState("p", "x") })).toBe(false);
  });
});
