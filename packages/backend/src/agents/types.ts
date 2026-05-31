import type { AssemblyState, TimelineEvent } from "@cad/shared";

export interface AgentContext {
  step: number;
  params: Record<string, number>;
}

export interface AgentResult {
  state: AssemblyState;
  events: TimelineEvent[];
}
