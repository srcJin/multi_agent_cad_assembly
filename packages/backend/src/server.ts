import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes";
import { initObservability } from "./obs/weave";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(cors, { origin: true });
  app.register(registerRoutes);
  return app;
}

async function main() {
  await initObservability("assemblycad-ai"); // no-op unless WEAVE_ENABLED=1 + WANDB_API_KEY
  const app = buildApp();
  const port = Number(process.env.PORT ?? 8000);
  await app.listen({ port, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`AssemblyCAD backend on :${port}`);
}

// run only when invoked directly (not under test import)
if (process.argv[1] && process.argv[1].endsWith("server.ts")) {
  main();
}
