import { describe, expect, it } from "vitest";
import type { DefaultIR } from "#src/types.js";
import { compileIR } from "./helpers.js";

describe("codegen — default", () => {
  it("uses default value when input is undefined", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);
    const result = safeParse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toBe("hello");
  });

  it("uses provided value when not undefined", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);
    const result = safeParse("world");
    expect(result.success).toBe(true);
    expect(result.data).toBe("world");
  });

  it("validates provided value against inner type", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);
    expect(safeParse(42).success).toBe(false);
  });

  it("null is not replaced by default (not undefined)", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);
    expect(safeParse(null).success).toBe(false);
  });
});
