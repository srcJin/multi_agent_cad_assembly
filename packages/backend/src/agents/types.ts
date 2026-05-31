import type { AssemblyState, TimelineEvent } from "@cad/shared";

export interface WorkflowParams {
  module: number;
  teethA: number;
  teethB: number;
  pressureAngle?: number;
  bore?: number;
  shaftDiameter?: number;
  wallThickness?: number;
  clearance?: number;
}

export interface AgentContext {
  step: number;
  params: WorkflowParams;
}

export type AgentResult = { state: AssemblyState; events: TimelineEvent[] };
