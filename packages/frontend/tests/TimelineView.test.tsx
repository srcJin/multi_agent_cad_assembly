import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineView } from "../src/tabs/TimelineView";
import { useStore } from "../src/lib/store";

describe("TimelineView", () => {
  beforeEach(() => {
    useStore.getState().reset();
    useStore.getState().setAssembly({ timeline: [
      { step: 0, agent: "DirectorAgent", action: "generated design plan", tool: "generate_plan", status: "ok", affectedParts: [] },
      { step: 1, agent: "ValidationAgent", action: "validated assembly", tool: "run_validation", status: "fail", affectedParts: ["gearA"] },
    ] } as any);
  });
  it("renders one row per event", () => { render(<TimelineView />); expect(screen.getAllByTestId("timeline-row").length).toBe(2); });
  it("shows agent + action", () => { render(<TimelineView />); expect(screen.getByText(/generated design plan/)).toBeInTheDocument(); });
});
