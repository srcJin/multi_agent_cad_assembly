import { describe, it, expect } from "vitest";
import { createEmptyState } from "@cad/shared";
import { recordToolCall } from "../src/tools/registry";

describe("tool registry", () => {
  it("appends a tool call to state", () => {
    const s = createEmptyState("p", "x");
    recordToolCall(s, { tool: "draw_rect", agent: "BoxDrawingAgent", inputSummary: "120x80", outputSummary: "ok" });
    expect(s.toolCalls).toHaveLength(1);
    expect(s.toolCalls[0].tool).toBe("draw_rect");
  });
});
