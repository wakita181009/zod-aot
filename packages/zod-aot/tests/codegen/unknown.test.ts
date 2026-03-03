import { describe, expect, it } from "vitest";
import type { UnknownIR } from "#src/types.js";
import { compileIR } from "./helpers.js";

describe("codegen — unknown", () => {
  it("accepts all values", () => {
    const ir: UnknownIR = { type: "unknown" };
    const safeParse = compileIR(ir);
    expect(safeParse("hello").success).toBe(true);
    expect(safeParse(42).success).toBe(true);
    expect(safeParse(null).success).toBe(true);
    expect(safeParse(undefined).success).toBe(true);
    expect(safeParse({}).success).toBe(true);
  });
});
