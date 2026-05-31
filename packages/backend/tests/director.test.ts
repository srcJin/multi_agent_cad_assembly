import { describe, it, expect } from "vitest";
import { createEmptyState, getPart } from "@cad/shared";
import { runDirector } from "../src/agents/director";

const ctx = { step: 0, params: { module: 2, teethA: 20, teethB: 20 } };

describe("director", () => {
  it("populates plan, intent, six parts and agent roster", () => {
    const { state, events } = runDirector(createEmptyState("cube-gearbox", "two meshing gears in a box"), ctx);
    expect(state.parts.map((p) => p.id).sort()).toEqual(
      ["box", "gearA", "gearB", "lid", "shaftA", "shaftB"]
    );
    expect(state.planText).not.toBe("");
    expect(state.designIntent).not.toBe("");
    expect(getPart(state, "gearA")!.ownerAgent).toBe("GearADrawingAgent");
    expect(state.agents.find((a) => a.name === "DirectorAgent")!.status).toBe("completed");
    expect(events.some((e) => e.agent === "DirectorAgent")).toBe(true);
  });
});
