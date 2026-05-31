import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OrchestrationView } from "../src/tabs/OrchestrationView";
import { buildOrchestrationStages } from "../src/lib/orchestrationStages";
import { useStore } from "../src/lib/store";

const agents = [
  { name: "DirectorAgent", role: "Director", status: "completed", owns: [] },
  { name: "BoxDrawingAgent", role: "Part:box", status: "completed", owns: ["box"] },
  { name: "GearADrawingAgent", role: "Part:gearA", status: "repaired", owns: ["gearA"] },
] as any;

const timeline = [
  { step: 0, agent: "DirectorAgent", action: "generated design plan", tool: "generate_plan", status: "ok", affectedParts: [] },
  { step: 2, agent: "BoxDrawingAgent", action: "generated box", tool: "create_box", status: "ok", affectedParts: ["box"] },
  { step: 2, agent: "GearADrawingAgent", action: "generated gearA", tool: "create_gear", status: "ok", affectedParts: ["gearA"] },
] as any;

describe("buildOrchestrationStages", () => {
  it("groups simultaneous agent events into a dispatch stage", () => {
    const stages = buildOrchestrationStages(timeline, agents);

    expect(stages.length).toBe(2);
    expect(stages[1].isDispatch).toBe(true);
    expect(stages[1].title).toBe("Dispatch 2 agents");
    expect(stages[1].agents.map((agent) => agent.name)).toEqual(["BoxDrawingAgent", "GearADrawingAgent"]);
  });
});

describe("OrchestrationView", () => {
  beforeEach(() => {
    useStore.getState().reset();
    useStore.getState().setAssembly({ agents, timeline } as any);
  });

  it("renders a vertical stage for each orchestration step", () => {
    render(<OrchestrationView />);

    expect(screen.getAllByTestId("orch-stage")).toHaveLength(2);
    expect(screen.getByText("Dispatch 2 agents")).toBeInTheDocument();
    expect(screen.getByText("parallel")).toBeInTheDocument();
  });

  it("selects a preview step from the orchestration rail", () => {
    render(<OrchestrationView />);

    fireEvent.click(screen.getByLabelText("Preview step 2"));

    expect(useStore.getState().previewStep).toBe(2);
    expect(screen.getByText("Step 2")).toBeInTheDocument();
  });
});
