import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/server";
import { store } from "../src/store";

const app = buildApp();
const params = { module: 2, teethA: 20, teethB: 20 };
const compoundParams = { designId: "compound-gearbox", module: 2, teethA: 16, teethB: 36, teethC: 14, teethD: 34 };
const idlerParams = { designId: "idler-transfer", module: 2, teethA: 18, teethB: 28, teethC: 22 };

describe("routes", () => {
  beforeEach(() => store.reset());

  it("POST /workflow/run returns state with seeded failure", async () => {
    const r = await app.inject({ method: "POST", url: "/workflow/run", payload: { prompt: "Create a 2D cube gearbox", params, seedFailure: true } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.parts).toHaveLength(6);
    expect(body.validation.passed).toBe(false);
  });

  it("POST /workflow/repair passes after seeded failure", async () => {
    await app.inject({ method: "POST", url: "/workflow/run", payload: { prompt: "g", params, seedFailure: true } });
    const r = await app.inject({ method: "POST", url: "/workflow/repair", payload: { params } });
    expect(r.statusCode).toBe(200);
    expect(r.json().validation.passed).toBe(true);
  });

  it("POST /workflow/run supports the compound gearbox design", async () => {
    const r = await app.inject({ method: "POST", url: "/workflow/run", payload: { prompt: "compound reduction gearbox", params: compoundParams } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.projectName).toBe("compound-gearbox");
    expect(body.parts).toHaveLength(9);
    expect(body.validation.passed).toBe(true);
  });

  it("POST /workflow/run supports the idler transfer design", async () => {
    const r = await app.inject({ method: "POST", url: "/workflow/run", payload: { prompt: "idler transfer gearbox", params: idlerParams } });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.projectName).toBe("idler-transfer");
    expect(body.parts).toHaveLength(8);
    expect(body.validation.passed).toBe(true);
  });

  it("GET /state 404 then 200 then reset 404", async () => {
    expect((await app.inject({ method: "GET", url: "/state" })).statusCode).toBe(404);
    await app.inject({ method: "POST", url: "/workflow/run", payload: { prompt: "g", params } });
    expect((await app.inject({ method: "GET", url: "/state" })).statusCode).toBe(200);
    await app.inject({ method: "POST", url: "/reset" });
    expect((await app.inject({ method: "GET", url: "/state" })).statusCode).toBe(404);
  });
});
