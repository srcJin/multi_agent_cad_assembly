import type { FastifyInstance } from "fastify";
import { runWorkflow, runRepairOnce } from "./agents/orchestrator";
import { store } from "./store";
import type { WorkflowParams } from "./agents/types";

const DEFAULT_PARAMS: WorkflowParams = { designId: "cube-gearbox", module: 2, teethA: 20, teethB: 20 };

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.post("/workflow/run", async (req) => {
    const b = req.body as { prompt?: string; params?: WorkflowParams; seedFailure?: boolean };
    const state = await runWorkflow(b.prompt ?? "Create a 2D cube gearbox", b.params ?? DEFAULT_PARAMS, { seedFailure: !!b.seedFailure });
    return store.set(state);
  });

  app.post("/workflow/repair", async (req, reply) => {
    const current = store.get();
    if (!current) return reply.code(404).send({ error: "no active project" });
    const b = req.body as { params?: WorkflowParams };
    const state = await runRepairOnce(current, b.params ?? DEFAULT_PARAMS);
    return store.set(state);
  });

  app.get("/state", async (_req, reply) => {
    const s = store.get();
    return s ? s : reply.code(404).send({ error: "no active project" });
  });

  app.post("/reset", async () => { store.reset(); return { status: "reset" }; });
  app.get("/export", async (_req, reply) => {
    const s = store.get();
    return s ? s : reply.code(404).send({ error: "no active project" });
  });
}
