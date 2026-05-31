import * as weave from "weave";
import type { AssemblyState } from "@cad/shared";
import { initObservability } from "../src/obs/weave";
import { runWorkflow, runRepairOnce } from "../src/agents/orchestrator";
import { GEARBOX_CASES, type GearboxCase } from "./dataset";
import { validationPass, repairRounds, centerDistanceError, crossViewConsistency, clearanceOk } from "./scorers";

// The weave Evaluation model receives { datasetRow } and scorers receive { datasetRow, modelOutput }.
// We wrap our pure scorers (which only need { modelOutput }) into the expected shape.
const model = weave.op(async ({ datasetRow }: { datasetRow: GearboxCase }): Promise<AssemblyState> => {
  const { prompt, params, seedFailure } = datasetRow;
  let state = await runWorkflow(prompt, params, { seedFailure });
  if (!state.validation.passed) state = await runRepairOnce(state, params);
  return state;
}, { name: "gearboxModel" });

const wrapScorer = <T>(
  fn: (args: { modelOutput: T }) => unknown,
  name: string
) =>
  weave.op(
    ({ modelOutput }: { datasetRow: GearboxCase; modelOutput: T }) => fn({ modelOutput }),
    { name }
  );

async function main() {
  await initObservability("assemblycad-ai"); // requires WEAVE_ENABLED=1 + WANDB_API_KEY
  const dataset = new weave.Dataset({ name: "gearbox-cases", rows: GEARBOX_CASES });
  const evaluation = new weave.Evaluation({
    name: "gearbox-eval",
    dataset,
    scorers: [
      wrapScorer(validationPass, "validationPass"),
      wrapScorer(repairRounds, "repairRounds"),
      wrapScorer(centerDistanceError, "centerDistanceError"),
      wrapScorer(crossViewConsistency, "crossViewConsistency"),
      wrapScorer(clearanceOk, "clearanceOk"),
    ],
  });
  const results = await evaluation.evaluate({ model });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(results, null, 2));
}

main();
