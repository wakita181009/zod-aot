import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckArray", () => {
  it("simple array: string[] accepts ['a'], rejects [42]", () => {
    const fn = compileFastCheck({
      type: "array",
      element: { type: "string", checks: [] },
      checks: [],
    });
    expect(fn?.(["a"])).toBe(true);
    expect(fn?.([42])).toBe(false);
  });

  it("min_length check", () => {
    const fn = compileFastCheck({
      type: "array",
      element: { type: "any" },
      checks: [{ kind: "min_length", minimum: 2 }],
    });
    expect(fn?.([1, 2])).toBe(true);
    expect(fn?.([1])).toBe(false);
  });

  it("max_length check", () => {
    const fn = compileFastCheck({
      type: "array",
      element: { type: "any" },
      checks: [{ kind: "max_length", maximum: 2 }],
    });
    expect(fn?.([1, 2])).toBe(true);
    expect(fn?.([1, 2, 3])).toBe(false);
  });

  it("any element (no .every needed)", () => {
    const fn = compileFastCheck({
      type: "array",
      element: { type: "any" },
      checks: [],
    });
    expect(fn?.([1, "a", null])).toBe(true);
  });

  it("ineligible element → returns null", () => {
    expect(
      compileFastCheck({
        type: "array",
        element: { type: "fallback", reason: "transform" },
        checks: [],
      }),
    ).toBeNull();
  });
});
