import { describe, expect, it } from "vitest";
import type { ObjectIR } from "#src/core/types.js";
import { compileFastCheck, compileIR } from "../helpers.js";

describe("slow-path — object", () => {
  it("accepts valid object", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        name: { type: "string", checks: [] },
        age: { type: "number", checks: [] },
      },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ name: "Alice", age: 30 })).toEqual({
      success: true,
      data: { name: "Alice", age: 30 },
    });
  });

  it("rejects non-object input", () => {
    const ir: ObjectIR = { type: "object", properties: { x: { type: "string", checks: [] } } };
    const safeParse = compileIR(ir);
    expect(safeParse("not an object").success).toBe(false);
    expect(safeParse(42).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(undefined).success).toBe(false);
  });

  it("rejects array as object", () => {
    const ir: ObjectIR = { type: "object", properties: { x: { type: "string", checks: [] } } };
    const safeParse = compileIR(ir);
    expect(safeParse([]).success).toBe(false);
  });

  it("rejects when required property is missing", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        name: { type: "string", checks: [] },
        age: { type: "number", checks: [] },
      },
    };
    const safeParse = compileIR(ir);
    const result = safeParse({ name: "Alice" });
    expect(result.success).toBe(false);
  });

  it("rejects when property type is wrong", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        name: { type: "string", checks: [] },
        age: { type: "number", checks: [] },
      },
    };
    const safeParse = compileIR(ir);
    const result = safeParse({ name: "Alice", age: "thirty" });
    expect(result.success).toBe(false);
  });

  it("validates property checks", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        name: { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
      },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ name: "Alice" }).success).toBe(true);
    expect(safeParse({ name: "Al" }).success).toBe(false);
  });

  it("validates nested objects", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string", checks: [] },
            age: { type: "number", checks: [] },
          },
        },
      },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ user: { name: "Alice", age: 30 } }).success).toBe(true);
    expect(safeParse({ user: { name: "Alice" } }).success).toBe(false);
    expect(safeParse({ user: "not an object" }).success).toBe(false);
  });

  it("provides correct path in nested errors", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
          },
        },
      },
    };
    const safeParse = compileIR(ir);
    const result = safeParse({ user: { name: "Al" } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["user", "name"],
    });
  });

  it("accepts empty object for empty schema", () => {
    const ir: ObjectIR = { type: "object", properties: {} };
    const safeParse = compileIR(ir);
    expect(safeParse({}).success).toBe(true);
  });

  it("collects multiple issues", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        a: { type: "string", checks: [] },
        b: { type: "number", checks: [] },
        c: { type: "boolean" },
      },
    };
    const safeParse = compileIR(ir);
    const result = safeParse({ a: 1, b: "two", c: "three" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(3);
  });
});

describe("fast-path — Object", () => {
  it("simple object: {name: string} accepts {name: 'a'}, rejects {name: 42}", () => {
    const fn = compileFastCheck({
      type: "object",
      properties: { name: { type: "string", checks: [] } },
    });
    expect(fn?.({ name: "a" })).toBe(true);
    expect(fn?.({ name: 42 })).toBe(false);
  });

  it("rejects null", () => {
    const fn = compileFastCheck({ type: "object", properties: {} });
    expect(fn?.(null)).toBe(false);
  });

  it("rejects array", () => {
    const fn = compileFastCheck({ type: "object", properties: {} });
    expect(fn?.([])).toBe(false);
  });

  it("rejects non-object", () => {
    const fn = compileFastCheck({ type: "object", properties: {} });
    expect(fn?.("string")).toBe(false);
  });

  it("nested object", () => {
    const fn = compileFastCheck({
      type: "object",
      properties: {
        inner: { type: "object", properties: { x: { type: "number", checks: [] } } },
      },
    });
    expect(fn?.({ inner: { x: 1 } })).toBe(true);
    expect(fn?.({ inner: { x: "a" } })).toBe(false);
  });

  it("ineligible property → returns null", () => {
    expect(
      compileFastCheck({
        type: "object",
        properties: { f: { type: "fallback", reason: "transform" } },
      }),
    ).toBeNull();
  });
});
