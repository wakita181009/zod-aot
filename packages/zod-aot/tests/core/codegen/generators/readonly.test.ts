import { describe, expect, it } from "vitest";
import type { ReadonlyIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — readonly", () => {
  it("delegates validation to inner type", () => {
    const ir: ReadonlyIR = {
      type: "readonly",
      inner: { type: "string", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("rejects invalid inner type", () => {
    const ir: ReadonlyIR = {
      type: "readonly",
      inner: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse("hello").success).toBe(false);
  });

  it("works with nested readonly", () => {
    const ir: ReadonlyIR = {
      type: "readonly",
      inner: {
        type: "readonly",
        inner: { type: "boolean" },
      },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(true)).toEqual({ success: true, data: true });
    expect(safeParse("true").success).toBe(false);
  });
});
