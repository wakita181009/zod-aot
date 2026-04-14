import { describe, expect, it } from "vitest";
import { generateValidator } from "#src/core/codegen/index.js";
import type { StringBoolIR } from "#src/core/types.js";
import { compileFastCheck, compileIR } from "../helpers.js";

const DEFAULT_IR: StringBoolIR = {
  type: "stringBool",
  truthy: ["true", "1", "yes", "on", "y", "enabled"],
  falsy: ["false", "0", "no", "off", "n", "disabled"],
  caseSensitive: false,
};

describe("slow-path — stringBool", () => {
  it("accepts truthy strings and returns true", () => {
    const safeParse = compileIR(DEFAULT_IR);
    expect(safeParse("true")).toEqual({ success: true, data: true });
    expect(safeParse("1")).toEqual({ success: true, data: true });
    expect(safeParse("yes")).toEqual({ success: true, data: true });
    expect(safeParse("on")).toEqual({ success: true, data: true });
    expect(safeParse("y")).toEqual({ success: true, data: true });
    expect(safeParse("enabled")).toEqual({ success: true, data: true });
  });

  it("accepts falsy strings and returns false", () => {
    const safeParse = compileIR(DEFAULT_IR);
    expect(safeParse("false")).toEqual({ success: true, data: false });
    expect(safeParse("0")).toEqual({ success: true, data: false });
    expect(safeParse("no")).toEqual({ success: true, data: false });
    expect(safeParse("off")).toEqual({ success: true, data: false });
    expect(safeParse("n")).toEqual({ success: true, data: false });
    expect(safeParse("disabled")).toEqual({ success: true, data: false });
  });

  it("case-insensitive by default", () => {
    const safeParse = compileIR(DEFAULT_IR);
    expect(safeParse("TRUE")).toEqual({ success: true, data: true });
    expect(safeParse("True")).toEqual({ success: true, data: true });
    expect(safeParse("FALSE")).toEqual({ success: true, data: false });
    expect(safeParse("Yes")).toEqual({ success: true, data: true });
  });

  it("rejects invalid strings", () => {
    const safeParse = compileIR(DEFAULT_IR);
    expect(safeParse("maybe").success).toBe(false);
    expect(safeParse("").success).toBe(false);
    expect(safeParse("2").success).toBe(false);
  });

  it("rejects non-string values", () => {
    const safeParse = compileIR(DEFAULT_IR);
    expect(safeParse(true).success).toBe(false);
    expect(safeParse(1).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(undefined).success).toBe(false);
  });

  it("case-sensitive mode rejects wrong case", () => {
    const ir: StringBoolIR = {
      type: "stringBool",
      truthy: ["true", "1"],
      falsy: ["false", "0"],
      caseSensitive: true,
    };
    const safeParse = compileIR(ir);
    expect(safeParse("true")).toEqual({ success: true, data: true });
    expect(safeParse("TRUE").success).toBe(false);
    expect(safeParse("True").success).toBe(false);
  });

  it("generates Set-based lookup for large value sets", () => {
    const result = generateValidator(DEFAULT_IR, "sbTest");
    expect(result.code).toContain("Set");
  });

  it("generates inline checks for small value sets (per-side threshold)", () => {
    // truthy=["1","yes","on"] (3) and falsy=["0"] (1): both ≤ threshold → inline
    const ir: StringBoolIR = {
      type: "stringBool",
      truthy: ["1", "yes", "on"],
      falsy: ["0"],
      caseSensitive: true,
    };
    const result = generateValidator(ir, "sbSmall");
    expect(result.functionDef).not.toContain("Set");
  });

  it("generates Set for large per-side value sets", () => {
    // truthy has 4 values (> ENUM_INLINE_THRESHOLD=3) → uses Set
    const ir: StringBoolIR = {
      type: "stringBool",
      truthy: ["true", "1", "yes", "on"],
      falsy: ["false", "0"],
      caseSensitive: false,
    };
    const result = generateValidator(ir, "sbLarge");
    expect(result.code).toContain("Set");
  });
});

describe("fast-path — stringBool", () => {
  it("returns null (not eligible — output type differs from input)", () => {
    const fn = compileFastCheck(DEFAULT_IR);
    expect(fn).toBeNull();
  });
});
