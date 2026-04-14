import { describe, expect, it } from "vitest";
import type { DefaultIR } from "#src/core/types.js";
import { compileFastCheck, compileIR } from "../helpers.js";

describe("slow-path — default", () => {
  it("uses default value when input is undefined", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);
    const result = safeParse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toBe("hello");
  });

  it("uses provided value when not undefined", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);
    const result = safeParse("world");
    expect(result.success).toBe(true);
    expect(result.data).toBe("world");
  });

  it("validates provided value against inner type", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);
    expect(safeParse(42).success).toBe(false);
  });

  it("null is not replaced by default (not undefined)", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);
    expect(safeParse(null).success).toBe(false);
  });

  // M5: Default value with Date object loses type via JSON.stringify
  it("Date default value is serialized as string, not Date (documents limitation)", () => {
    const dateValue = new Date("2024-01-01T00:00:00.000Z");
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "date", checks: [] },
      defaultValue: dateValue,
    };
    const safeParse = compileIR(ir);
    // When input is undefined, the default value is applied.
    // But JSON.stringify(Date) produces a string, not a Date object.
    const result = safeParse(undefined);
    // BUG: The default value is inserted as a JSON string "2024-01-01T00:00:00.000Z"
    // which then fails the `instanceof Date` check in the date validator
    expect(result.success).toBe(false);
  });

  it("object default value works correctly", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: {
        type: "object",
        properties: {
          name: { type: "string", checks: [] },
        },
      },
      defaultValue: { name: "default" },
    };
    const safeParse = compileIR(ir);
    const result = safeParse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "default" });
  });
});

describe("fast-path — default", () => {
  it("accepts valid non-undefined input via fast path", () => {
    const fn = compileFastCheck({
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    });
    expect(fn).not.toBeNull();
    expect(fn?.("world")).toBe(true);
  });

  it("rejects undefined (delegates to slow path for default application)", () => {
    const fn = compileFastCheck({
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    });
    expect(fn).not.toBeNull();
    expect(fn?.(undefined)).toBe(false);
  });

  it("rejects invalid non-undefined input", () => {
    const fn = compileFastCheck({
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    });
    expect(fn).not.toBeNull();
    expect(fn?.(42)).toBe(false);
  });

  it("validates inner checks for non-undefined input", () => {
    const fn = compileFastCheck({
      type: "default",
      inner: { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
      defaultValue: "hello",
    });
    expect(fn).not.toBeNull();
    expect(fn?.("abc")).toBe(true);
    expect(fn?.("ab")).toBe(false);
    expect(fn?.(undefined)).toBe(false);
  });

  it("ineligible inner → returns null", () => {
    expect(
      compileFastCheck({
        type: "default",
        inner: { type: "fallback", reason: "transform" },
        defaultValue: "",
      }),
    ).toBeNull();
  });

  it("nested default inside object — object gains fast path", () => {
    const fn = compileFastCheck({
      type: "object",
      properties: {
        name: {
          type: "default",
          inner: { type: "string", checks: [] },
          defaultValue: "anon",
        },
      },
    });
    // Object with non-undefined property should pass fast path
    expect(fn).not.toBeNull();
    expect(fn?.({ name: "hello" })).toBe(true);
  });

  it("end-to-end: fast path + slow path produce correct results", () => {
    const ir: DefaultIR = {
      type: "default",
      inner: { type: "string", checks: [] },
      defaultValue: "hello",
    };
    const safeParse = compileIR(ir);

    // Valid input: should use fast path, return input as-is
    expect(safeParse("world")).toEqual({ success: true, data: "world" });

    // undefined: slow path applies default
    expect(safeParse(undefined)).toEqual({ success: true, data: "hello" });

    // Invalid: slow path collects errors
    expect(safeParse(42).success).toBe(false);
  });
});
