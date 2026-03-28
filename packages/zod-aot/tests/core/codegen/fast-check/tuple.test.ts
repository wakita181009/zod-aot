import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckTuple", () => {
  it("[string, number]: accepts ['a', 1], rejects ['a', 'b']", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
      rest: null,
    });
    expect(fn?.(["a", 1])).toBe(true);
    expect(fn?.(["a", "b"])).toBe(false);
  });

  it("exact length (no rest): rejects extra elements", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: null,
    });
    expect(fn?.(["a"])).toBe(true);
    expect(fn?.(["a", "b"])).toBe(false);
  });

  it("with rest element", () => {
    const fn = compileFastCheck({
      type: "tuple",
      items: [{ type: "string", checks: [] }],
      rest: { type: "number", checks: [] },
    });
    expect(fn?.(["a", 1, 2])).toBe(true);
    expect(fn?.(["a", 1, "b"])).toBe(false);
  });

  it("ineligible item → returns null", () => {
    expect(
      compileFastCheck({
        type: "tuple",
        items: [{ type: "fallback", reason: "transform" }],
        rest: null,
      }),
    ).toBeNull();
  });
});
