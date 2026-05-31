import { describe, it, expect } from "vitest";
import { agentsToNodes } from "../src/tabs/OrchestrationView";

describe("agentsToNodes", () => {
  it("maps each agent to a node with status data", () => {
    const nodes = agentsToNodes([
      { name: "DirectorAgent", role: "Director", status: "completed", owns: [] },
      { name: "GearADrawingAgent", role: "Part:gearA", status: "repaired", owns: ["gearA"] },
    ] as any);
    expect(nodes.length).toBe(2);
    expect(nodes[0].data.status).toBe("completed");
    expect(nodes[1].id).toBe("GearADrawingAgent");
  });
});
