import { describe, expect, it } from "vitest";
import type { ReadonlyIR } from "#src/types.js";
import { compileIR } from "./helpers.js";

describe("codegen — readonly", () => {
  it("validates inner type", () => {
    const ir: ReadonlyIR = { type: "readonly", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse("hello").success).toBe(true);
    expect(safeParse(42).success).toBe(false);
  });

  it("validates inner object", () => {
    const ir: ReadonlyIR = {
      type: "readonly",
      inner: { type: "object", properties: { x: { type: "number", checks: [] } } },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ x: 1 }).success).toBe(true);
    expect(safeParse({ x: "a" }).success).toBe(false);
  });
});
