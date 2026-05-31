import { createRequire } from "module";

// weave ships as CommonJS. Load it via createRequire so it works identically
// under Vitest and real Node ESM (tsx) — a bare `require` is undefined in ESM,
// and a static `import` would run weave's integration hooks even when disabled.
const require = createRequire(import.meta.url);

let initialized = false;
let weaveMod: typeof import("weave") | null = null;

function loadWeave(): typeof import("weave") {
  if (!weaveMod) weaveMod = require("weave") as typeof import("weave");
  return weaveMod;
}

export function isWeaveEnabled(): boolean {
  return process.env.WEAVE_ENABLED === "1" && !!process.env.WANDB_API_KEY;
}

// Initialize Weave once; returns true when Weave was initialized, false when disabled.
export async function initObservability(project = "assemblycad-ai"): Promise<boolean> {
  if (!isWeaveEnabled() || initialized) return initialized;
  const weave = loadWeave();
  await weave.init(project);
  initialized = true;
  return true;
}

// Wrap any async fn as a Weave op. When Weave is disabled the original fn is
// returned untouched, so offline/no-key demos and tests still run.
export function op<F extends (...args: any[]) => any>(fn: F, opts?: { name?: string }): F {
  if (!isWeaveEnabled()) return fn;
  return loadWeave().op(fn, opts) as F;
}
