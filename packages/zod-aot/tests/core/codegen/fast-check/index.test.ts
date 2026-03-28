import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("generateFastCheck dispatcher", () => {
  it("any → always true", () => {
    const fn = compileFastCheck({ type: "any" });
    expect(fn?.("anything")).toBe(true);
  });

  it("unknown → always true", () => {
    const fn = compileFastCheck({ type: "unknown" });
    expect(fn?.(42)).toBe(true);
  });

  it("null → true for null, false for other", () => {
    const fn = compileFastCheck({ type: "null" });
    expect(fn?.(null)).toBe(true);
    expect(fn?.(undefined)).toBe(false);
  });

  it("undefined → true for undefined, false for other", () => {
    const fn = compileFastCheck({ type: "undefined" });
    expect(fn?.(undefined)).toBe(true);
    expect(fn?.(null)).toBe(false);
  });

  it("symbol → true for Symbol(), false for other", () => {
    const fn = compileFastCheck({ type: "symbol" });
    expect(fn?.(Symbol())).toBe(true);
    expect(fn?.("symbol")).toBe(false);
  });

  it("void → true for undefined, false for other", () => {
    const fn = compileFastCheck({ type: "void" });
    expect(fn?.(undefined)).toBe(true);
    expect(fn?.(null)).toBe(false);
  });

  it("nan → true for NaN, false for 0", () => {
    const fn = compileFastCheck({ type: "nan" });
    expect(fn?.(Number.NaN)).toBe(true);
    expect(fn?.(0)).toBe(false);
  });

  it("never → always false", () => {
    const fn = compileFastCheck({ type: "never" });
    expect(fn?.("anything")).toBe(false);
  });

  it("boolean → true for true/false, false for 0/'true'", () => {
    const fn = compileFastCheck({ type: "boolean" });
    expect(fn?.(true)).toBe(true);
    expect(fn?.(false)).toBe(true);
    expect(fn?.(0)).toBe(false);
    expect(fn?.("true")).toBe(false);
  });

  it("boolean with coerce → null", () => {
    expect(compileFastCheck({ type: "boolean", coerce: true })).toBeNull();
  });

  it("fallback → null", () => {
    expect(compileFastCheck({ type: "fallback", reason: "transform" })).toBeNull();
  });

  it("default → null", () => {
    expect(
      compileFastCheck({
        type: "default",
        inner: { type: "string", checks: [] },
        defaultValue: "",
      }),
    ).toBeNull();
  });

  it("catch → null", () => {
    expect(
      compileFastCheck({ type: "catch", inner: { type: "string", checks: [] }, defaultValue: "" }),
    ).toBeNull();
  });

  it("date → null", () => {
    expect(compileFastCheck({ type: "date", checks: [] })).toBeNull();
  });

  it("set → null", () => {
    expect(compileFastCheck({ type: "set", valueType: { type: "string", checks: [] } })).toBeNull();
  });

  it("map → null", () => {
    expect(
      compileFastCheck({
        type: "map",
        keyType: { type: "string", checks: [] },
        valueType: { type: "number", checks: [] },
      }),
    ).toBeNull();
  });

  it("recursiveRef → null", () => {
    expect(compileFastCheck({ type: "recursiveRef" })).toBeNull();
  });
});
