import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckIntersection", () => {
  it("{a:string} & {b:number}: accepts {a:'x',b:1}, rejects {a:1,b:1}", () => {
    const fn = compileFastCheck({
      type: "intersection",
      left: { type: "object", properties: { a: { type: "string", checks: [] } } },
      right: { type: "object", properties: { b: { type: "number", checks: [] } } },
    });
    expect(fn?.({ a: "x", b: 1 })).toBe(true);
    expect(fn?.({ a: 1, b: 1 })).toBe(false);
  });

  it("ineligible left → returns null", () => {
    expect(
      compileFastCheck({
        type: "intersection",
        left: { type: "fallback", reason: "transform" },
        right: { type: "object", properties: {} },
      }),
    ).toBeNull();
  });

  it("ineligible right → returns null", () => {
    expect(
      compileFastCheck({
        type: "intersection",
        left: { type: "object", properties: {} },
        right: { type: "fallback", reason: "transform" },
      }),
    ).toBeNull();
  });
});
