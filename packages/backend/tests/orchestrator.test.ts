import { describe, it, expect } from "vitest";
import { createEmptyState } from "@cad/shared";
import { recordToolCall } from "../src/tools/registry";
import { runWorkflow, runRepairOnce } from "../src/agents/orchestrator";

const params = { module: 2, teethA: 20, teethB: 20 };

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

  it("seeded failure then repair passes", async () => {
    const failed = await runWorkflow("gearbox", params, { seedFailure: true });
    expect(failed.validation.passed).toBe(false);
    const repaired = await runRepairOnce(failed, params);
    expect(repaired.validation.passed).toBe(true);
    expect(repaired.repairHistory.length).toBeGreaterThanOrEqual(1);
  });
});
