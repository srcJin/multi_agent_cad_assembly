import type { AgentState, TimelineEvent } from "@cad/shared";

interface StageAgent {
  name: string;
  role: string;
  status: string;
  action: string;
  tool: string | null;
  affectedParts: string[];
  owns: string[];
}

export interface OrchestrationStage {
  step: number;
  title: string;
  isDispatch: boolean;
  failed: boolean;
  agents: StageAgent[];
}

function uniqueByAgent(events: TimelineEvent[]): TimelineEvent[] {
  const seen = new Set<string>();
  const unique: TimelineEvent[] = [];
  for (const event of events) {
    if (seen.has(event.agent)) continue;
    seen.add(event.agent);
    unique.push(event);
  }
  return unique;
}

export function buildOrchestrationStages(timeline: TimelineEvent[], agents: AgentState[]): OrchestrationStage[] {
  const agentByName = new Map(agents.map((agent) => [agent.name, agent]));
  const eventsByStep = new Map<number, TimelineEvent[]>();

  for (const event of timeline) {
    const events = eventsByStep.get(event.step) ?? [];
    events.push(event);
    eventsByStep.set(event.step, events);
  }

  return [...eventsByStep.entries()]
    .sort(([a], [b]) => a - b)
    .map(([step, events]) => {
      const stageAgents = uniqueByAgent(events).map((event) => {
        const agent = agentByName.get(event.agent);
        return {
          name: event.agent,
          role: agent?.role ?? "Agent",
          status: agent?.status ?? event.status,
          action: event.action,
          tool: event.tool,
          affectedParts: event.affectedParts,
          owns: agent?.owns ?? [],
        };
      });
      const isDispatch = stageAgents.length > 1;

      return {
        step,
        title: isDispatch ? `Dispatch ${stageAgents.length} agents` : stageAgents[0]?.name ?? `Step ${step}`,
        isDispatch,
        failed: events.some((event) => event.status === "fail"),
        agents: stageAgents,
      };
    });
}
