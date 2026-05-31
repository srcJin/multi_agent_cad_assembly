import { describe, it, expect } from "vitest";
import { op, isWeaveEnabled } from "../src/obs/weave";

describe("weave wrapper", () => {
  it("disabled by default in tests (no WEAVE_ENABLED env)", () => {
    expect(isWeaveEnabled()).toBe(false);
  });

  it("op() passes through and preserves behavior when disabled", async () => {
    const add = op(async (a: number, b: number) => a + b, { name: "add" });
    expect(await add(2, 3)).toBe(5);
  });
});
