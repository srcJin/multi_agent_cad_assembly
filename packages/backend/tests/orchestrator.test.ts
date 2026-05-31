import { describe, it, expect } from "vitest";
import { createEmptyState } from "@cad/shared";
import { recordToolCall } from "../src/tools/registry";
import { runWorkflow, runRepairOnce } from "../src/agents/orchestrator";

const params = { module: 2, teethA: 20, teethB: 20 };
const compoundParams = { designId: "compound-gearbox" as const, module: 2, teethA: 16, teethB: 36, teethC: 14, teethD: 34 };
const idlerParams = { designId: "idler-transfer" as const, module: 2, teethA: 18, teethB: 28, teethC: 22 };

describe("tool registry", () => {
  it("appends a tool call to state", () => {
    const s = createEmptyState("p", "x");
    recordToolCall(s, { tool: "draw_rect", agent: "BoxDrawingAgent", inputSummary: "120x80", outputSummary: "ok" });
    expect(s.toolCalls).toHaveLength(1);
    expect(s.toolCalls[0].tool).toBe("draw_rect");
  });
});

describe("orchestrator", () => {
  it("runs the full pipeline producing state + timeline", async () => {
    const state = await runWorkflow("Create a 2D cube gearbox", params);
    expect(state.parts).toHaveLength(6);
    expect(state.constraints.length).toBeGreaterThanOrEqual(4);
    expect(state.timeline.length).toBeGreaterThanOrEqual(8);
    expect(state.validation.items.length).toBeGreaterThan(0);
  });

  it("runs the compound gearbox pipeline without replacing the cube design", async () => {
    const state = await runWorkflow("Create a compact compound reduction gearbox", compoundParams);
    expect(state.projectName).toBe("compound-gearbox");
    expect(state.parts.map((part) => part.id)).toEqual(["box", "gearA", "gearB", "gearC", "gearD", "shaftA", "shaftB", "shaftC", "lid"]);
    expect(state.constraints.filter((constraint) => constraint.type === "gear_mesh")).toHaveLength(2);
    expect(state.validation.passed).toBe(true);
  });

  it("runs the idler transfer pipeline as a third design case", async () => {
    const state = await runWorkflow("Create an idler transfer gearbox", idlerParams);
    expect(state.projectName).toBe("idler-transfer");
    expect(state.parts.map((part) => part.id)).toEqual(["box", "gearA", "gearB", "gearC", "shaftA", "shaftB", "shaftC", "lid"]);
    expect(state.constraints.filter((constraint) => constraint.type === "gear_mesh")).toHaveLength(2);
    expect(state.validation.passed).toBe(true);
  });

  it("seeded failure then repair passes", async () => {
    const failed = await runWorkflow("gearbox", params, { seedFailure: true });
    expect(failed.validation.passed).toBe(false);
    const repaired = await runRepairOnce(failed, params);
    expect(repaired.validation.passed).toBe(true);
    expect(repaired.repairHistory.length).toBeGreaterThanOrEqual(1);
  });
});
