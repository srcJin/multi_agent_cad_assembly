import type { AssemblyState } from "@cad/shared";
import { createEmptyState, getPart } from "@cad/shared";
import { op } from "../obs/weave";
import { runDirector } from "./director";
import { runLayoutPreview } from "./layoutPreview";
import { runPartDrawingAgents } from "./partDrawing";
import { runSimulationAgent } from "./simulation";
import { runValidationAgent } from "./validation";
import { runRepairCoordinator } from "./repair";
import type { WorkflowParams, AgentContext, AgentResult } from "./types";

// Apply weave.op lazily at first call (after initObservability has run at startup),
// so the enabled path never hits the synchronous createRequire fallback. When Weave
// is disabled, this is a thin pass-through.
function lazyOp<F extends (...args: any[]) => any>(fn: F, opts?: { name?: string }): F {
  let wrapped: F | undefined;
  return ((...args: any[]) => {
    if (!wrapped) wrapped = op(fn, opts);
    return wrapped(...args);
  }) as F;
}

type AgentFn = (s: AssemblyState, c: AgentContext) => Promise<AgentResult>;

const opDirector: AgentFn = lazyOp(async (s, c) => runDirector(s, c), { name: "DirectorAgent" });
const opLayout: AgentFn = lazyOp(async (s, c) => runLayoutPreview(s, c), { name: "LayoutPreviewAgent" });
const opParts: AgentFn = lazyOp(async (s, c) => runPartDrawingAgents(s, c), { name: "PartDrawingAgents" });
const opSim: AgentFn = lazyOp(async (s, c) => runSimulationAgent(s, c), { name: "SimulationAgent" });
const opVal: AgentFn = lazyOp(async (s, c) => runValidationAgent(s, c), { name: "ValidationAgent" });
const opRepair: AgentFn = lazyOp(async (s, c) => runRepairCoordinator(s, c), { name: "RepairCoordinator" });

interface RunOpts { seedFailure?: boolean }

async function runWorkflowImpl(prompt: string, params: WorkflowParams, opts: RunOpts = {}): Promise<AssemblyState> {
  let state = createEmptyState("cube-gearbox", prompt);
  let step = 0;
  const pump = async (fn: AgentFn) => {
    const res = await fn(state, { step, params });
    state = res.state;
    state.timeline.push(...res.events);
    step += res.events.length || 1;
  };

  await pump(opDirector);
  await pump(opLayout);
  await pump(opParts);
  await pump(opSim);

  if (opts.seedFailure) {
    const gA = getPart(state, "gearA")!;
    gA.drawing.center = [gA.drawing.center[0] - 15, 0];
    gA.simulation.center = [...gA.drawing.center];
  }

  await pump(opVal);
  state.status = "validated";
  return state;
}

async function runRepairOnceImpl(state: AssemblyState, params: WorkflowParams): Promise<AssemblyState> {
  const pump = async (fn: AgentFn) => {
    const res = await fn(state, { step: state.timeline.length, params });
    state = res.state;
    state.timeline.push(...res.events);
  };
  await pump(opRepair);
  await pump(opSim);
  await pump(opVal);
  state.status = "repaired";
  return state;
}

// Top-level workflow ops: one root trace contains the whole nested pipeline.
export const runWorkflow = lazyOp(runWorkflowImpl, { name: "runWorkflow" });
export const runRepairOnce = lazyOp(runRepairOnceImpl, { name: "runRepairOnce" });
