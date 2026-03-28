import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckLiteral", () => {
  it("single value: accepts 'foo', rejects 'bar'", () => {
    const fn = compileFastCheck({ type: "literal", values: ["foo"] });
    expect(fn?.("foo")).toBe(true);
    expect(fn?.("bar")).toBe(false);
  });

  it("multiple values: accepts 'a' or 'b', rejects 'c'", () => {
    const fn = compileFastCheck({ type: "literal", values: ["a", "b"] });
    expect(fn?.("a")).toBe(true);
    expect(fn?.("b")).toBe(true);
    expect(fn?.("c")).toBe(false);
  });

  it("numeric literal: accepts 42, rejects 43", () => {
    const fn = compileFastCheck({ type: "literal", values: [42] });
    expect(fn?.(42)).toBe(true);
    expect(fn?.(43)).toBe(false);
  });

  it("boolean literal: accepts true, rejects false", () => {
    const fn = compileFastCheck({ type: "literal", values: [true] });
    expect(fn?.(true)).toBe(true);
    expect(fn?.(false)).toBe(false);
  });

  it("null literal: accepts null, rejects undefined", () => {
    const fn = compileFastCheck({ type: "literal", values: [null] });
    expect(fn?.(null)).toBe(true);
    expect(fn?.(undefined)).toBe(false);
  });
});
