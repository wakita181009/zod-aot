import { describe, expect, it } from "vitest";
import type { PipeIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — pipe (non-transform)", () => {
  it("validates input through both schemas", () => {
    const ir: PipeIR = {
      type: "pipe",
      in: { type: "string", checks: [] },
      out: { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse("hello").success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
    expect(safeParse(42).success).toBe(false);
  });

  it("rejects when input schema fails", () => {
    const ir: PipeIR = {
      type: "pipe",
      in: { type: "number", checks: [{ kind: "greater_than", value: 0, inclusive: false }] },
      out: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(5).success).toBe(true);
    expect(safeParse(0).success).toBe(false);
    expect(safeParse("not number").success).toBe(false);
  });

  it("rejects when output schema fails", () => {
    const ir: PipeIR = {
      type: "pipe",
      in: { type: "string", checks: [] },
      out: { type: "string", checks: [{ kind: "max_length", maximum: 5 }] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse("short").success).toBe(true);
    expect(safeParse("too long string").success).toBe(false);
  });

  it("pipes different compatible types (number → number with checks)", () => {
    const ir: PipeIR = {
      type: "pipe",
      in: { type: "number", checks: [] },
      out: {
        type: "number",
        checks: [
          { kind: "greater_than", value: 0, inclusive: true },
          { kind: "less_than", value: 100, inclusive: true },
        ],
      },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(50).success).toBe(true);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(100).success).toBe(true);
    expect(safeParse(-1).success).toBe(false);
    expect(safeParse(101).success).toBe(false);
  });
});
