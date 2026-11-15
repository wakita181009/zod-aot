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

  it("rejects an absent presence key with a nonoptional issue", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: { a: { type: "unknown" } },
      presenceKeys: ["a"],
    };
    const safeParse = compileIR(ir);
    expect(safeParse({}).error?.issues).toEqual([
      { code: "invalid_type", expected: "nonoptional", input: undefined, path: ["a"] },
    ]);
  });

  it("accepts a presence key that is present with an undefined value", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: { a: { type: "unknown" } },
      presenceKeys: ["a"],
    };
    expect(compileIR(ir)({ a: undefined })).toEqual({ success: true, data: { a: undefined } });
  });

  it("reports the property's own issue instead of nonoptional", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        a: {
          type: "union",
          options: [{ type: "undefined" }, { type: "string", checks: [] }],
        },
      },
      presenceKeys: ["a"],
    };
    const result = compileIR(ir)({ a: 1 });
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]).toMatchObject({ code: "invalid_union", path: ["a"] });
  });

  it("keeps nonoptional issues in key order with other issues", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        a: { type: "string", checks: [] },
        b: { type: "any" },
        c: { type: "number", checks: [] },
      },
      presenceKeys: ["b"],
    };
    const result = compileIR(ir)({ a: 1, c: "x" });
    expect(result.error?.issues.map((i) => [i.code, i.path])).toEqual([
      ["invalid_type", ["a"]],
      ["invalid_type", ["b"]],
      ["invalid_type", ["c"]],
    ]);
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

  it("presence key: rejects an absent key, accepts an explicit undefined", () => {
    const fn = compileFastCheck({
      type: "object",
      properties: { a: { type: "unknown" } },
      presenceKeys: ["a"],
    });
    expect(fn?.({})).toBe(false);
    expect(fn?.({ a: undefined })).toBe(true);
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

describe("unknown keys — slow path", () => {
  const str = { type: "string", checks: [] } as const;

  it("strip: builds a new output without unknown keys", () => {
    const input = { a: "x", extra: 1 };
    const result = compileIR({ type: "object", properties: { a: str } })(input);
    expect(result).toEqual({ success: true, data: { a: "x" } });
    expect(result.data).not.toBe(input);
    expect(input).toEqual({ a: "x", extra: 1 });
  });

  it("strip: an absent optional key stays absent", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: { a: { type: "optional", inner: str } },
    };
    const data = compileIR(ir)({}).data as object;
    expect(Object.keys(data)).toEqual([]);
  });

  it("strict: one unrecognized_keys issue listing every unknown key", () => {
    const ir: ObjectIR = { type: "object", properties: { a: str }, catchall: { type: "never" } };
    expect(compileIR(ir)({ a: "x", y: 1, z: 2 }).error?.issues).toEqual([
      { code: "unrecognized_keys", keys: ["y", "z"], input: undefined, path: [] },
    ]);
    expect(compileIR(ir)({ a: "x" }).success).toBe(true);
  });

  it("passthrough: keeps unknown keys but drops an own __proto__", () => {
    const ir: ObjectIR = { type: "object", properties: { a: str }, catchall: { type: "unknown" } };
    const input = JSON.parse('{"a":"x","extra":1,"__proto__":{"p":1}}');
    const data = compileIR(ir)(input).data as Record<string, unknown>;
    expect(Object.keys(data)).toEqual(["a", "extra"]);
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
  });

  it("catchall schema: validates unknown values with their key in the path", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: { a: str },
      catchall: { type: "number", checks: [] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse({ a: "x", n: 1 })).toEqual({ success: true, data: { a: "x", n: 1 } });
    expect(safeParse({ a: "x", n: "no" }).error?.issues).toMatchObject([
      { code: "invalid_type", expected: "number", path: ["n"] },
    ]);
  });

  it("uses a Set lookup for shapes above the inline threshold", () => {
    const properties = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`k${i}`, { type: "optional", inner: str }]),
    ) as ObjectIR["properties"];
    const ir: ObjectIR = { type: "object", properties, catchall: { type: "never" } };
    const safeParse = compileIR(ir);
    expect(safeParse({ k0: "a", k9: "b" }).success).toBe(true);
    expect(safeParse({ k0: "a", other: 1 }).error?.issues).toMatchObject([
      { code: "unrecognized_keys", keys: ["other"] },
    ]);
  });

  it("absentWrittenKeys: writes absent keys as undefined (Zod 4.0)", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: { a: { type: "unknown" }, b: { type: "optional", inner: str } },
      absentWrittenKeys: ["a"],
    };
    const data = compileIR(ir)({}).data as object;
    expect(Object.keys(data)).toEqual(["a"]);
  });

  it("removes a key the input lacks when a rewriting property yields undefined", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        a: {
          type: "effect",
          effectKind: "transform",
          source: "() => undefined",
          inner: { type: "unknown" },
        },
      },
    };
    expect(Object.keys(compileIR(ir)({}).data as object)).toEqual([]);
    expect(Object.keys(compileIR(ir)({ a: 1 }).data as object)).toEqual(["a"]);
  });
});

describe("unknown keys — fast path", () => {
  const str = { type: "string", checks: [] } as const;

  it("strip and strict reject inputs with unknown keys", () => {
    for (const catchall of [undefined, { type: "never" } as const]) {
      const fn = compileFastCheck({
        type: "object",
        properties: { a: str },
        ...(catchall ? { catchall } : {}),
      });
      expect(fn?.({ a: "x" })).toBe(true);
      expect(fn?.({ a: "x", extra: 1 })).toBe(false);
    }
  });

  it("passthrough accepts unknown keys except an own __proto__", () => {
    const fn = compileFastCheck({
      type: "object",
      properties: { a: str },
      catchall: { type: "unknown" },
    });
    expect(fn?.({ a: "x", extra: 1 })).toBe(true);
    expect(fn?.(JSON.parse('{"a":"x","__proto__":{}}'))).toBe(false);
  });

  it("catchall schema checks unknown values", () => {
    const fn = compileFastCheck({
      type: "object",
      properties: { a: str },
      catchall: { type: "number", checks: [] },
    });
    expect(fn?.({ a: "x", n: 1 })).toBe(true);
    expect(fn?.({ a: "x", n: "no" })).toBe(false);
  });

  it("an ineligible catchall disables the fast path", () => {
    expect(
      compileFastCheck({
        type: "object",
        properties: {},
        catchall: { type: "fallback", reason: "transform" },
      }),
    ).toBeNull();
  });

  it("absentWrittenKeys must be present", () => {
    const fn = compileFastCheck({
      type: "object",
      properties: { a: { type: "unknown" } },
      absentWrittenKeys: ["a"],
    });
    expect(fn?.({})).toBe(false);
    expect(fn?.({ a: 1 })).toBe(true);
  });
});
