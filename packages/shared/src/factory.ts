import type { AssemblyState } from "./assemblyState";

export function createEmptyState(projectName: string, userPrompt: string): AssemblyState {
  return {
    projectName,
    userPrompt,
    version: 0,
    status: "created",
    designIntent: "",
    planText: "",
    layout: {
      boxSize: [0, 0],
      wallThickness: 0,
      gearCenters: {},
      shaftPositions: {},
      centerDistance: 0,
      lidPosition: null,
    },
    parts: [],
    constraints: [],
    agents: [],
    timeline: [],
    toolCalls: [],
    validation: { items: [], passed: false },
    repairHistory: [],
    weaveTraceUrl: null,
  };
}

export function getPart(state: AssemblyState, id: string) {
  return state.parts.find((p) => p.id === id);
}
