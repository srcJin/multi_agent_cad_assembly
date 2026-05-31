import type { AssemblyState } from "@cad/shared";

export interface ToolCallInput {
  tool: string;
  agent: string;
  inputSummary?: string;
  outputSummary?: string;
  status?: string;
}

export function recordToolCall(state: AssemblyState, c: ToolCallInput): void {
  state.toolCalls.push({
    tool: c.tool,
    agent: c.agent,
    inputSummary: c.inputSummary ?? "",
    outputSummary: c.outputSummary ?? "",
    status: c.status ?? "ok",
  });
}
