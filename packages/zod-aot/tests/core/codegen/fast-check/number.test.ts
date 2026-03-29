import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckNumber", () => {
  it("plain number: accepts 42, rejects '42'", () => {
    const fn = compileFastCheck({ type: "number", checks: [] });
    expect(fn?.(42)).toBe(true);
    expect(fn?.("42")).toBe(false);
  });

  it("with coerce: returns null", () => {
    expect(compileFastCheck({ type: "number", checks: [], coerce: true })).toBeNull();
  });

  it("rejects NaN", () => {
    const fn = compileFastCheck({ type: "number", checks: [] });
    expect(fn?.(Number.NaN)).toBe(false);
  });

  it("rejects Infinity", () => {
    const fn = compileFastCheck({ type: "number", checks: [] });
    expect(fn?.(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("safeint: accepts 1, rejects 1.5", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "number_format", format: "safeint" }],
    });
    expect(fn?.(1)).toBe(true);
    expect(fn?.(1.5)).toBe(false);
  });

  it("int32: accepts 0, rejects 2147483648", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "number_format", format: "int32" }],
    });
    expect(fn?.(0)).toBe(true);
    expect(fn?.(2147483648)).toBe(false);
  });

  it("uint32: accepts 0, rejects -1, rejects 4294967296", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "number_format", format: "uint32" }],
    });
    expect(fn?.(0)).toBe(true);
    expect(fn?.(-1)).toBe(false);
    expect(fn?.(4294967296)).toBe(false);
  });

  it("float32: accepts 1.5, rejects too large", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "number_format", format: "float32" }],
    });
    expect(fn?.(1.5)).toBe(true);
    // 1.1 cannot be represented exactly as float32
    expect(fn?.(1.1)).toBe(false);
  });

  it("float64: accepts any finite number", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "number_format", format: "float64" }],
    });
    expect(fn?.(Number.MAX_VALUE)).toBe(true);
    expect(fn?.(Number.MIN_VALUE)).toBe(true);
  });

  it("greater_than inclusive", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "greater_than", value: 5, inclusive: true }],
    });
    expect(fn?.(5)).toBe(true);
    expect(fn?.(4)).toBe(false);
  });

  it("greater_than exclusive", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "greater_than", value: 5, inclusive: false }],
    });
    expect(fn?.(6)).toBe(true);
    expect(fn?.(5)).toBe(false);
  });

  it("less_than inclusive", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "less_than", value: 10, inclusive: true }],
    });
    expect(fn?.(10)).toBe(true);
    expect(fn?.(11)).toBe(false);
  });

  it("less_than exclusive", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "less_than", value: 10, inclusive: false }],
    });
    expect(fn?.(9)).toBe(true);
    expect(fn?.(10)).toBe(false);
  });

  it("string-only checks on number schema are skipped", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [
        { kind: "min_length", minimum: 1 },
        { kind: "max_length", maximum: 10 },
        { kind: "length_equals", length: 5 },
        { kind: "string_format", format: "email" },
        { kind: "includes", includes: "foo" },
        { kind: "starts_with", prefix: "bar" },
        { kind: "ends_with", suffix: "baz" },
      ],
    });
    // All string-only checks are skipped, only typeof/isNaN/isFinite remain
    expect(fn?.(42)).toBe(true);
    expect(fn?.("42")).toBe(false);
  });

  it("multiple_of: accepts 6 for 3, rejects 7", () => {
    const fn = compileFastCheck({
      type: "number",
      checks: [{ kind: "multiple_of", value: 3 }],
    });
    expect(fn?.(6)).toBe(true);
    expect(fn?.(7)).toBe(false);
  });
});
