import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckRecord", () => {
  it("Record<string, number>: accepts {a: 1}, rejects {a: 'x'}", () => {
    const fn = compileFastCheck({
      type: "record",
      keyType: { type: "string", checks: [] },
      valueType: { type: "number", checks: [] },
    });
    expect(fn?.({ a: 1 })).toBe(true);
    expect(fn?.({ a: "x" })).toBe(false);
  });

  it("rejects null", () => {
    const fn = compileFastCheck({
      type: "record",
      keyType: { type: "string", checks: [] },
      valueType: { type: "any" },
    });
    expect(fn?.(null)).toBe(false);
  });

  it("rejects non-object", () => {
    const fn = compileFastCheck({
      type: "record",
      keyType: { type: "string", checks: [] },
      valueType: { type: "any" },
    });
    expect(fn?.("string")).toBe(false);
  });

  it("Record<any, any>: both key and value are 'true', skips .every()", () => {
    const fn = compileFastCheck({
      type: "record",
      keyType: { type: "any" },
      valueType: { type: "any" },
    });
    expect(fn?.({ a: 1, b: "x" })).toBe(true);
    expect(fn?.(null)).toBe(false);
  });

  it("Record<any, number>: only value check in .every()", () => {
    const fn = compileFastCheck({
      type: "record",
      keyType: { type: "any" },
      valueType: { type: "number", checks: [] },
    });
    expect(fn?.({ a: 1, b: 2 })).toBe(true);
    expect(fn?.({ a: "x" })).toBe(false);
  });

  it("ineligible key → returns null", () => {
    expect(
      compileFastCheck({
        type: "record",
        keyType: { type: "fallback", reason: "transform" },
        valueType: { type: "number", checks: [] },
      }),
    ).toBeNull();
  });

  it("ineligible value → returns null", () => {
    expect(
      compileFastCheck({
        type: "record",
        keyType: { type: "string", checks: [] },
        valueType: { type: "fallback", reason: "transform" },
      }),
    ).toBeNull();
  });
});
