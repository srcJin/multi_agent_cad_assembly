import type { WorkflowParams } from "../src/agents/types";

export interface GearboxCase {
  id: string;
  prompt: string;
  params: WorkflowParams;
  seedFailure: boolean;
  expectedPassAfterRepair: boolean;
}

export const GEARBOX_CASES: GearboxCase[] = [
  { id: "baseline-20-20", prompt: "Create a 2D cube gearbox", params: { module: 2, teethA: 20, teethB: 20 }, seedFailure: false, expectedPassAfterRepair: true },
  { id: "seeded-failure-20-20", prompt: "Create a 2D cube gearbox", params: { module: 2, teethA: 20, teethB: 20 }, seedFailure: true, expectedPassAfterRepair: true },
  { id: "asymmetric-20-30", prompt: "gearbox with a reduction", params: { module: 2, teethA: 20, teethB: 30 }, seedFailure: false, expectedPassAfterRepair: true },
  { id: "fine-module-1-24-24", prompt: "fine-pitch gearbox", params: { module: 1, teethA: 24, teethB: 24 }, seedFailure: true, expectedPassAfterRepair: true },
];
