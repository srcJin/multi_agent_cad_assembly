import type { AssemblyState, ToolCall } from "@cad/shared";

export function recordToolCall(
  state: AssemblyState,
  call: Omit<ToolCall, "status"> & { status?: string }
): void {
  state.toolCalls.push({
    tool: call.tool,
    agent: call.agent,
    inputSummary: call.inputSummary,
    outputSummary: call.outputSummary,
    status: call.status ?? "ok",
  });
}
