import { describe, expect, it } from "vitest";
import type { NumberIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — number", () => {
  it("generates code that accepts a number", () => {
    const ir: NumberIR = { type: "number", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(42)).toEqual({ success: true, data: 42 });
  });

  it("generates code that rejects non-number", () => {
    const ir: NumberIR = { type: "number", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse("42").success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(undefined).success).toBe(false);
    expect(safeParse(true).success).toBe(false);
  });

  it("generates code that rejects NaN", () => {
    const ir: NumberIR = { type: "number", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(NaN).success).toBe(false);
  });

  it("generates greater_than (inclusive) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "greater_than", value: 0, inclusive: true }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(1).success).toBe(true);
    expect(safeParse(-1).success).toBe(false);
  });

  it("generates greater_than (exclusive) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "greater_than", value: 0, inclusive: false }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(1).success).toBe(true);
    expect(safeParse(0).success).toBe(false);
    expect(safeParse(-1).success).toBe(false);
  });

  it("generates less_than (inclusive) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "less_than", value: 100, inclusive: true }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(100).success).toBe(true);
    expect(safeParse(99).success).toBe(true);
    expect(safeParse(101).success).toBe(false);
  });

  it("generates less_than (exclusive) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "less_than", value: 100, inclusive: false }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(99).success).toBe(true);
    expect(safeParse(100).success).toBe(false);
  });

  it("generates number_format (safeint) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "number_format", format: "safeint" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(42).success).toBe(true);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(-1).success).toBe(true);
    expect(safeParse(3.14).success).toBe(false);
    expect(safeParse(Infinity).success).toBe(false);
  });

  it("generates multiple_of check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "multiple_of", value: 5 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(5).success).toBe(true);
    expect(safeParse(10).success).toBe(true);
    expect(safeParse(3).success).toBe(false);
    expect(safeParse(7).success).toBe(false);
  });

  it("generates number_format (int32) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "number_format", format: "int32" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(42).success).toBe(true);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(-2147483648).success).toBe(true);
    expect(safeParse(2147483647).success).toBe(true);
    expect(safeParse(3.14).success).toBe(false);
    expect(safeParse(-2147483649).success).toBe(false);
    expect(safeParse(2147483648).success).toBe(false);
  });

  it("generates number_format (uint32) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "number_format", format: "uint32" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(42).success).toBe(true);
    expect(safeParse(4294967295).success).toBe(true);
    expect(safeParse(3.14).success).toBe(false);
    expect(safeParse(-1).success).toBe(false);
    expect(safeParse(4294967296).success).toBe(false);
  });

  it("generates number_format (float32) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "number_format", format: "float32" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(3.14).success).toBe(true);
    expect(safeParse(-3.4028234663852886e38).success).toBe(true);
    expect(safeParse(3.4028234663852886e38).success).toBe(true);
    expect(safeParse(-3.5e38).success).toBe(false);
    expect(safeParse(3.5e38).success).toBe(false);
  });

  it("generates number_format (float64) — no extra checks beyond isFinite", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "number_format", format: "float64" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(3.14).success).toBe(true);
    expect(safeParse(Number.MAX_VALUE).success).toBe(true);
    expect(safeParse(-Number.MAX_VALUE).success).toBe(true);
    expect(safeParse(Infinity).success).toBe(false);
    expect(safeParse(NaN).success).toBe(false);
  });

  it("generates range check (min + max)", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [
        { kind: "greater_than", value: 1, inclusive: true },
        { kind: "less_than", value: 100, inclusive: true },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(1).success).toBe(true);
    expect(safeParse(50).success).toBe(true);
    expect(safeParse(100).success).toBe(true);
    expect(safeParse(0).success).toBe(false);
    expect(safeParse(101).success).toBe(false);
  });
});
