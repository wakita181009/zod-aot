import { describe, expect, it } from "vitest";
import type { OptionalIR } from "#src/types.js";
import { compileIR } from "./helpers.js";

describe("codegen — optional", () => {
  it("accepts the inner type", () => {
    const ir: OptionalIR = { type: "optional", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("accepts undefined", () => {
    const ir: OptionalIR = { type: "optional", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse(undefined)).toEqual({ success: true, data: undefined });
  });

  it("rejects null (optional is not nullable)", () => {
    const ir: OptionalIR = { type: "optional", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse(null).success).toBe(false);
  });

  it("validates inner checks when value is present", () => {
    const ir: OptionalIR = {
      type: "optional",
      inner: { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse(undefined).success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
  });
});
