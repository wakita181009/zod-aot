import { describe, expect, it } from "vitest";
import type { OptionalIR } from "#src/core/types.js";
import { compileFastCheck, compileIR } from "../helpers.js";

describe("slow-path — optional", () => {
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

  describe("wrapping a default", () => {
    const ir: OptionalIR = {
      type: "optional",
      inner: { type: "default", inner: { type: "string", checks: [] }, refIndex: 0 },
    };
    const refs = [{ _zod: { def: { defaultValue: "d" } } }];

    it("substitutes the default for undefined", () => {
      expect(compileIR(ir, "test", refs)(undefined)).toEqual({ success: true, data: "d" });
    });

    it("validates a present value against the inner type", () => {
      const safeParse = compileIR(ir, "test", refs);
      expect(safeParse("x")).toEqual({ success: true, data: "x" });
      expect(safeParse(1).success).toBe(false);
    });
  });
});

describe("fast-path — Optional", () => {
  it("optional string: accepts 'a', accepts undefined, rejects 42", () => {
    const fn = compileFastCheck({ type: "optional", inner: { type: "string", checks: [] } });
    expect(fn?.("a")).toBe(true);
    expect(fn?.(undefined)).toBe(true);
    expect(fn?.(42)).toBe(false);
  });

  it("wrapping a default: rejects undefined so the slow path substitutes it", () => {
    const fn = compileFastCheck({
      type: "optional",
      inner: { type: "default", inner: { type: "string", checks: [] }, refIndex: 0 },
    });
    expect(fn?.(undefined)).toBe(false);
    expect(fn?.("a")).toBe(true);
  });

  it("ineligible inner → returns null", () => {
    expect(
      compileFastCheck({ type: "optional", inner: { type: "fallback", reason: "transform" } }),
    ).toBeNull();
  });
});
