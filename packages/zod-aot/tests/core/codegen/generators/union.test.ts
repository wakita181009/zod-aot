import { describe, expect, it } from "vitest";
import type { UnionIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — union", () => {
  it("accepts first option", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("accepts second option", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(42)).toEqual({ success: true, data: 42 });
  });

  it("rejects value matching no option", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(true).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse([]).success).toBe(false);
  });

  it("validates checks within union options", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
        { type: "number", checks: [{ kind: "greater_than", value: 0, inclusive: false }] },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse(1).success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
    expect(safeParse(0).success).toBe(false);
  });

  it("handles union with three options", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
        { type: "boolean" },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("hello").success).toBe(true);
    expect(safeParse(42).success).toBe(true);
    expect(safeParse(true).success).toBe(true);
    expect(safeParse(null).success).toBe(false);
  });
});
