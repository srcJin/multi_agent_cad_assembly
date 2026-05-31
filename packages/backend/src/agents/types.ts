import type { AssemblyState, TimelineEvent } from "@cad/shared";

export interface WorkflowParams {
  designId?: "cube-gearbox" | "compound-gearbox" | "idler-transfer";
  module: number;
  teethA: number;
  teethB: number;
  teethC?: number;
  teethD?: number;
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
