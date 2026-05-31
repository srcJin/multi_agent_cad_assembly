let initialized = false;

export function isWeaveEnabled(): boolean {
  return process.env.WEAVE_ENABLED === "1" && !!process.env.WANDB_API_KEY;
}

// Initialize Weave once; returns true when Weave was initialized, false when disabled.
export async function initObservability(project = "assemblycad-ai"): Promise<boolean> {
  if (!isWeaveEnabled() || initialized) return initialized;
  const weave = await import("weave");
  await weave.init(project);
  initialized = true;
  return true;
}

// Wrap any async fn as a Weave op. When Weave is disabled the original fn is
// returned untouched, so offline/no-key demos and tests still run.
export function op<F extends (...args: any[]) => any>(fn: F, opts?: { name?: string }): F {
  if (!isWeaveEnabled()) return fn;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const weave = require("weave") as typeof import("weave");
  return weave.op(fn, opts) as F;
}
