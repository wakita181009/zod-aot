import { describe, expect, it } from "vitest";
import type { BigIntIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — bigint", () => {
  it("generates code that accepts a bigint", () => {
    const ir: BigIntIR = { type: "bigint", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(42n)).toEqual({ success: true, data: 42n });
  });

  it("generates code that rejects non-bigint", () => {
    const ir: BigIntIR = { type: "bigint", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(42).success).toBe(false);
    expect(safeParse("42").success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(undefined).success).toBe(false);
    expect(safeParse(true).success).toBe(false);
    expect(safeParse({}).success).toBe(false);
  });

  it("generates greater_than (inclusive) check", () => {
    const ir: BigIntIR = {
      type: "bigint",
      checks: [{ kind: "bigint_greater_than", value: "0", inclusive: true }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0n).success).toBe(true);
    expect(safeParse(1n).success).toBe(true);
    expect(safeParse(-1n).success).toBe(false);
  });

  it("generates greater_than (exclusive) check", () => {
    const ir: BigIntIR = {
      type: "bigint",
      checks: [{ kind: "bigint_greater_than", value: "0", inclusive: false }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(1n).success).toBe(true);
    expect(safeParse(0n).success).toBe(false);
    expect(safeParse(-1n).success).toBe(false);
  });

  it("generates less_than (inclusive) check", () => {
    const ir: BigIntIR = {
      type: "bigint",
      checks: [{ kind: "bigint_less_than", value: "100", inclusive: true }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(100n).success).toBe(true);
    expect(safeParse(99n).success).toBe(true);
    expect(safeParse(101n).success).toBe(false);
  });

  it("generates less_than (exclusive) check", () => {
    const ir: BigIntIR = {
      type: "bigint",
      checks: [{ kind: "bigint_less_than", value: "100", inclusive: false }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(99n).success).toBe(true);
    expect(safeParse(100n).success).toBe(false);
  });

  it("generates multiple_of check", () => {
    const ir: BigIntIR = {
      type: "bigint",
      checks: [{ kind: "bigint_multiple_of", value: "3" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0n).success).toBe(true);
    expect(safeParse(3n).success).toBe(true);
    expect(safeParse(9n).success).toBe(true);
    expect(safeParse(1n).success).toBe(false);
    expect(safeParse(7n).success).toBe(false);
  });

  it("generates range check (min + max)", () => {
    const ir: BigIntIR = {
      type: "bigint",
      checks: [
        { kind: "bigint_greater_than", value: "1", inclusive: true },
        { kind: "bigint_less_than", value: "100", inclusive: true },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(1n).success).toBe(true);
    expect(safeParse(50n).success).toBe(true);
    expect(safeParse(100n).success).toBe(true);
    expect(safeParse(0n).success).toBe(false);
    expect(safeParse(101n).success).toBe(false);
  });

  it("generates negative bigint values in checks", () => {
    const ir: BigIntIR = {
      type: "bigint",
      checks: [{ kind: "bigint_less_than", value: "0", inclusive: false }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(-1n).success).toBe(true);
    expect(safeParse(-100n).success).toBe(true);
    expect(safeParse(0n).success).toBe(false);
    expect(safeParse(1n).success).toBe(false);
  });
});
