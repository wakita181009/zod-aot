import { describe, expect, it } from "vitest";
import { generateValidator } from "#src/codegen/index.js";
import type {
  ArrayIR,
  BooleanIR,
  EnumIR,
  LiteralIR,
  NullableIR,
  NullIR,
  NumberIR,
  ObjectIR,
  OptionalIR,
  SchemaIR,
  StringIR,
  UndefinedIR,
  UnionIR,
} from "#src/types.js";

/**
 * Helper: generate code from IR, compile it, and return the safeParse function.
 */
function compileIR(
  ir: SchemaIR,
  name = "test",
): (input: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } {
  const result = generateValidator(ir, name);
  // The generated code should export a safeParse function
  const fn = new Function(`${result.code}\nreturn ${result.functionName};`);
  return fn() as (input: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { issues: unknown[] };
  };
}

// ─── String Validation ──────────────────────────────────────────────────────

describe("codegen — string", () => {
  it("generates code that accepts a string", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("generates code that rejects non-string", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const safeParse = compileIR(ir);
    const result = safeParse(42);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      code: "invalid_type",
      expected: "string",
    });
  });

  it("generates code that rejects null", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(null).success).toBe(false);
  });

  it("generates code that rejects undefined", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(undefined).success).toBe(false);
  });

  it("generates min_length check", () => {
    const ir: StringIR = { type: "string", checks: [{ kind: "min_length", minimum: 3 }] };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
    expect(safeParse("").success).toBe(false);
  });

  it("generates max_length check", () => {
    const ir: StringIR = { type: "string", checks: [{ kind: "max_length", maximum: 5 }] };
    const safeParse = compileIR(ir);
    expect(safeParse("abcde").success).toBe(true);
    expect(safeParse("abcdef").success).toBe(false);
  });

  it("generates length_equals check", () => {
    const ir: StringIR = { type: "string", checks: [{ kind: "length_equals", length: 3 }] };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
    expect(safeParse("abcd").success).toBe(false);
  });

  it("generates combined min + max check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [
        { kind: "min_length", minimum: 2 },
        { kind: "max_length", maximum: 5 },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("ab").success).toBe(true);
    expect(safeParse("abcde").success).toBe(true);
    expect(safeParse("a").success).toBe(false);
    expect(safeParse("abcdef").success).toBe(false);
  });

  it("generates regex check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "regex", pattern: "^[a-z]+$" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse("ABC").success).toBe(false);
    expect(safeParse("abc123").success).toBe(false);
  });

  it("generates email format check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "email" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("user@example.com").success).toBe(true);
    expect(safeParse("not-an-email").success).toBe(false);
    expect(safeParse("").success).toBe(false);
  });

  it("collects multiple issues for min_length violation on string with checks", () => {
    const ir: StringIR = {
      type: "string",
      checks: [
        { kind: "min_length", minimum: 5 },
        { kind: "string_format", format: "regex", pattern: "^[A-Z]" },
      ],
    };
    const safeParse = compileIR(ir);
    // "ab" fails both min_length and regex
    const result = safeParse("ab");
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Number Validation ──────────────────────────────────────────────────────

describe("codegen — number", () => {
  it("generates code that accepts a number", () => {
    const ir: NumberIR = { type: "number", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(42)).toEqual({ success: true, data: 42 });
  });

  it("generates code that rejects non-number", () => {
    const ir: NumberIR = { type: "number", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse("42").success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(undefined).success).toBe(false);
    expect(safeParse(true).success).toBe(false);
  });

  it("generates code that rejects NaN", () => {
    const ir: NumberIR = { type: "number", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(NaN).success).toBe(false);
  });

  it("generates greater_than (inclusive) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "greater_than", value: 0, inclusive: true }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(1).success).toBe(true);
    expect(safeParse(-1).success).toBe(false);
  });

  it("generates greater_than (exclusive) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "greater_than", value: 0, inclusive: false }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(1).success).toBe(true);
    expect(safeParse(0).success).toBe(false);
    expect(safeParse(-1).success).toBe(false);
  });

  it("generates less_than (inclusive) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "less_than", value: 100, inclusive: true }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(100).success).toBe(true);
    expect(safeParse(99).success).toBe(true);
    expect(safeParse(101).success).toBe(false);
  });

  it("generates less_than (exclusive) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "less_than", value: 100, inclusive: false }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(99).success).toBe(true);
    expect(safeParse(100).success).toBe(false);
  });

  it("generates number_format (safeint) check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "number_format", format: "safeint" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(42).success).toBe(true);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(-1).success).toBe(true);
    expect(safeParse(3.14).success).toBe(false);
    expect(safeParse(Infinity).success).toBe(false);
  });

  it("generates multiple_of check", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [{ kind: "multiple_of", value: 5 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse(5).success).toBe(true);
    expect(safeParse(10).success).toBe(true);
    expect(safeParse(3).success).toBe(false);
    expect(safeParse(7).success).toBe(false);
  });

  it("generates range check (min + max)", () => {
    const ir: NumberIR = {
      type: "number",
      checks: [
        { kind: "greater_than", value: 1, inclusive: true },
        { kind: "less_than", value: 100, inclusive: true },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(1).success).toBe(true);
    expect(safeParse(50).success).toBe(true);
    expect(safeParse(100).success).toBe(true);
    expect(safeParse(0).success).toBe(false);
    expect(safeParse(101).success).toBe(false);
  });
});

// ─── Boolean Validation ─────────────────────────────────────────────────────

describe("codegen — boolean", () => {
  it("accepts true and false", () => {
    const ir: BooleanIR = { type: "boolean" };
    const safeParse = compileIR(ir);
    expect(safeParse(true)).toEqual({ success: true, data: true });
    expect(safeParse(false)).toEqual({ success: true, data: false });
  });

  it("rejects non-boolean", () => {
    const ir: BooleanIR = { type: "boolean" };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(false);
    expect(safeParse("true").success).toBe(false);
    expect(safeParse(null).success).toBe(false);
  });
});

// ─── Null / Undefined Validation ────────────────────────────────────────────

describe("codegen — null", () => {
  it("accepts null", () => {
    const ir: NullIR = { type: "null" };
    const safeParse = compileIR(ir);
    expect(safeParse(null)).toEqual({ success: true, data: null });
  });

  it("rejects non-null", () => {
    const ir: NullIR = { type: "null" };
    const safeParse = compileIR(ir);
    expect(safeParse(undefined).success).toBe(false);
    expect(safeParse(0).success).toBe(false);
    expect(safeParse("").success).toBe(false);
  });
});

describe("codegen — undefined", () => {
  it("accepts undefined", () => {
    const ir: UndefinedIR = { type: "undefined" };
    const safeParse = compileIR(ir);
    expect(safeParse(undefined)).toEqual({ success: true, data: undefined });
  });

  it("rejects non-undefined", () => {
    const ir: UndefinedIR = { type: "undefined" };
    const safeParse = compileIR(ir);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(0).success).toBe(false);
  });
});

// ─── Literal Validation ─────────────────────────────────────────────────────

describe("codegen — literal", () => {
  it("accepts matching string literal", () => {
    const ir: LiteralIR = { type: "literal", values: ["hello"] };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("rejects non-matching string literal", () => {
    const ir: LiteralIR = { type: "literal", values: ["hello"] };
    const safeParse = compileIR(ir);
    expect(safeParse("world").success).toBe(false);
  });

  it("accepts matching number literal", () => {
    const ir: LiteralIR = { type: "literal", values: [42] };
    const safeParse = compileIR(ir);
    expect(safeParse(42)).toEqual({ success: true, data: 42 });
    expect(safeParse(43).success).toBe(false);
  });

  it("accepts matching boolean literal", () => {
    const ir: LiteralIR = { type: "literal", values: [true] };
    const safeParse = compileIR(ir);
    expect(safeParse(true)).toEqual({ success: true, data: true });
    expect(safeParse(false).success).toBe(false);
  });

  it("accepts matching null literal", () => {
    const ir: LiteralIR = { type: "literal", values: [null] };
    const safeParse = compileIR(ir);
    expect(safeParse(null)).toEqual({ success: true, data: null });
    expect(safeParse(undefined).success).toBe(false);
  });

  it("uses strict equality (no type coercion)", () => {
    const ir: LiteralIR = { type: "literal", values: [0] };
    const safeParse = compileIR(ir);
    expect(safeParse(0).success).toBe(true);
    expect(safeParse("0").success).toBe(false);
    expect(safeParse(false).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
  });
});

// ─── Enum Validation ────────────────────────────────────────────────────────

describe("codegen — enum", () => {
  it("accepts valid enum values", () => {
    const ir: EnumIR = { type: "enum", values: ["admin", "user", "guest"] };
    const safeParse = compileIR(ir);
    expect(safeParse("admin").success).toBe(true);
    expect(safeParse("user").success).toBe(true);
    expect(safeParse("guest").success).toBe(true);
  });

  it("rejects invalid enum values", () => {
    const ir: EnumIR = { type: "enum", values: ["admin", "user", "guest"] };
    const safeParse = compileIR(ir);
    expect(safeParse("superadmin").success).toBe(false);
    expect(safeParse("").success).toBe(false);
    expect(safeParse(42).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
  });

  it("generates Set-based lookup for enums", () => {
    const ir: EnumIR = { type: "enum", values: ["a", "b", "c"] };
    const result = generateValidator(ir, "enumTest");
    // The generated code should use Set for O(1) lookup
    expect(result.code).toContain("Set");
  });
});

// ─── Object Validation ──────────────────────────────────────────────────────

describe("codegen — object", () => {
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

// ─── Array Validation ───────────────────────────────────────────────────────

describe("codegen — array", () => {
  it("accepts valid array", () => {
    const ir: ArrayIR = { type: "array", element: { type: "string", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", "b", "c"])).toEqual({ success: true, data: ["a", "b", "c"] });
  });

  it("accepts empty array", () => {
    const ir: ArrayIR = { type: "array", element: { type: "string", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse([])).toEqual({ success: true, data: [] });
  });

  it("rejects non-array", () => {
    const ir: ArrayIR = { type: "array", element: { type: "string", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse("not array").success).toBe(false);
    expect(safeParse(42).success).toBe(false);
    expect(safeParse({}).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
  });

  it("rejects array with invalid element type", () => {
    const ir: ArrayIR = { type: "array", element: { type: "string", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    const result = safeParse(["valid", 42, "also valid"]);
    expect(result.success).toBe(false);
  });

  it("provides correct path for element errors", () => {
    const ir: ArrayIR = { type: "array", element: { type: "number", checks: [] }, checks: [] };
    const safeParse = compileIR(ir);
    const result = safeParse([1, "two", 3]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: [1],
    });
  });

  it("validates min_length check", () => {
    const ir: ArrayIR = {
      type: "array",
      element: { type: "string", checks: [] },
      checks: [{ kind: "min_length", minimum: 2 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", "b"]).success).toBe(true);
    expect(safeParse(["a"]).success).toBe(false);
    expect(safeParse([]).success).toBe(false);
  });

  it("validates max_length check", () => {
    const ir: ArrayIR = {
      type: "array",
      element: { type: "string", checks: [] },
      checks: [{ kind: "max_length", maximum: 3 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(["a", "b", "c"]).success).toBe(true);
    expect(safeParse(["a", "b", "c", "d"]).success).toBe(false);
  });

  it("validates length_equals check", () => {
    const ir: ArrayIR = {
      type: "array",
      element: { type: "number", checks: [] },
      checks: [{ kind: "length_equals", length: 3 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse([1, 2, 3]).success).toBe(true);
    expect(safeParse([1, 2]).success).toBe(false);
    expect(safeParse([1, 2, 3, 4]).success).toBe(false);
  });

  it("validates array of objects", () => {
    const ir: ArrayIR = {
      type: "array",
      element: {
        type: "object",
        properties: {
          id: { type: "number", checks: [] },
          name: { type: "string", checks: [] },
        },
      },
      checks: [],
    };
    const safeParse = compileIR(ir);
    expect(safeParse([{ id: 1, name: "Alice" }]).success).toBe(true);
    expect(safeParse([{ id: "one", name: "Alice" }]).success).toBe(false);
  });
});

// ─── Union Validation ───────────────────────────────────────────────────────

describe("codegen — union", () => {
  it("accepts first option", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("accepts second option", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(42)).toEqual({ success: true, data: 42 });
  });

  it("rejects value matching no option", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(true).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse([]).success).toBe(false);
  });

  it("validates checks within union options", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
        { type: "number", checks: [{ kind: "greater_than", value: 0, inclusive: false }] },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse(1).success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
    expect(safeParse(0).success).toBe(false);
  });

  it("handles union with three options", () => {
    const ir: UnionIR = {
      type: "union",
      options: [
        { type: "string", checks: [] },
        { type: "number", checks: [] },
        { type: "boolean" },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("hello").success).toBe(true);
    expect(safeParse(42).success).toBe(true);
    expect(safeParse(true).success).toBe(true);
    expect(safeParse(null).success).toBe(false);
  });
});

// ─── Optional Validation ────────────────────────────────────────────────────

describe("codegen — optional", () => {
  it("accepts the inner type", () => {
    const ir: OptionalIR = { type: "optional", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("accepts undefined", () => {
    const ir: OptionalIR = { type: "optional", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse(undefined)).toEqual({ success: true, data: undefined });
  });

  it("rejects null (optional is not nullable)", () => {
    const ir: OptionalIR = { type: "optional", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse(null).success).toBe(false);
  });

  it("validates inner checks when value is present", () => {
    const ir: OptionalIR = {
      type: "optional",
      inner: { type: "string", checks: [{ kind: "min_length", minimum: 3 }] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse(undefined).success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
  });
});

// ─── Nullable Validation ────────────────────────────────────────────────────

describe("codegen — nullable", () => {
  it("accepts the inner type", () => {
    const ir: NullableIR = { type: "nullable", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("accepts null", () => {
    const ir: NullableIR = { type: "nullable", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse(null)).toEqual({ success: true, data: null });
  });

  it("rejects undefined (nullable is not optional)", () => {
    const ir: NullableIR = { type: "nullable", inner: { type: "string", checks: [] } };
    const safeParse = compileIR(ir);
    expect(safeParse(undefined).success).toBe(false);
  });

  it("validates inner checks when value is present", () => {
    const ir: NullableIR = {
      type: "nullable",
      inner: { type: "number", checks: [{ kind: "greater_than", value: 0, inclusive: true }] },
    };
    const safeParse = compileIR(ir);
    expect(safeParse(5).success).toBe(true);
    expect(safeParse(null).success).toBe(true);
    expect(safeParse(-1).success).toBe(false);
  });
});

// ─── Code Generation Quality ────────────────────────────────────────────────

describe("codegen — code quality", () => {
  it("returns a valid CodeGenResult", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const result = generateValidator(ir, "myValidator");
    expect(result).toHaveProperty("code");
    expect(result).toHaveProperty("functionName");
    expect(typeof result.code).toBe("string");
    expect(typeof result.functionName).toBe("string");
    expect(result.code.length).toBeGreaterThan(0);
    expect(result.functionName).toContain("myValidator");
  });

  it("generates unique function names", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const result1 = generateValidator(ir, "schemaA");
    const result2 = generateValidator(ir, "schemaB");
    expect(result1.functionName).not.toBe(result2.functionName);
  });

  it("generates syntactically valid JavaScript", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        name: { type: "string", checks: [{ kind: "min_length", minimum: 1 }] },
        items: {
          type: "array",
          element: { type: "number", checks: [] },
          checks: [{ kind: "max_length", maximum: 100 }],
        },
        status: { type: "enum", values: ["active", "inactive"] },
      },
    };
    const result = generateValidator(ir, "complexSchema");
    // Should not throw when creating a Function from it
    expect(() => new Function(result.code)).not.toThrow();
  });
});

// ─── Complex Schema Code Generation ────────────────────────────────────────

describe("codegen — complex schemas", () => {
  it("generates validator for user registration schema", () => {
    const ir: ObjectIR = {
      type: "object",
      properties: {
        username: {
          type: "string",
          checks: [
            { kind: "min_length", minimum: 3 },
            { kind: "max_length", maximum: 20 },
            { kind: "string_format", format: "regex", pattern: "^[a-zA-Z0-9_]+$" },
          ],
        },
        email: {
          type: "string",
          checks: [{ kind: "string_format", format: "email" }],
        },
        age: {
          type: "number",
          checks: [
            { kind: "number_format", format: "safeint" },
            { kind: "greater_than", value: 0, inclusive: false },
            { kind: "less_than", value: 150, inclusive: true },
          ],
        },
        role: { type: "enum", values: ["admin", "user"] },
        bio: {
          type: "optional",
          inner: { type: "string", checks: [{ kind: "max_length", maximum: 500 }] },
        },
        tags: {
          type: "array",
          element: { type: "string", checks: [{ kind: "min_length", minimum: 1 }] },
          checks: [{ kind: "max_length", maximum: 10 }],
        },
      },
    };

    const safeParse = compileIR(ir);

    // Valid input
    expect(
      safeParse({
        username: "alice_123",
        email: "alice@example.com",
        age: 25,
        role: "user",
        tags: ["developer"],
      }).success,
    ).toBe(true);

    // Valid with optional bio
    expect(
      safeParse({
        username: "bob",
        email: "bob@test.com",
        age: 30,
        role: "admin",
        bio: "Hello world",
        tags: [],
      }).success,
    ).toBe(true);

    // Invalid: username too short
    expect(
      safeParse({
        username: "ab",
        email: "valid@test.com",
        age: 25,
        role: "user",
        tags: [],
      }).success,
    ).toBe(false);

    // Invalid: bad email
    expect(
      safeParse({
        username: "alice",
        email: "not-email",
        age: 25,
        role: "user",
        tags: [],
      }).success,
    ).toBe(false);

    // Invalid: age is float
    expect(
      safeParse({
        username: "alice",
        email: "alice@test.com",
        age: 25.5,
        role: "user",
        tags: [],
      }).success,
    ).toBe(false);

    // Invalid: bad role
    expect(
      safeParse({
        username: "alice",
        email: "alice@test.com",
        age: 25,
        role: "superadmin",
        tags: [],
      }).success,
    ).toBe(false);
  });
});
