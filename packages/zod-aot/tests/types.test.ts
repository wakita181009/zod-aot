import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  CheckIR,
  CompiledSchema,
  SafeParseError,
  SafeParseResult,
  SafeParseSuccess,
  SchemaIR,
  StringIR,
  ZodErrorLike,
  ZodIssueLike,
} from "#src/types.js";

// ─── SchemaIR Type Discrimination ───────────────────────────────────────────

describe("SchemaIR — type discrimination", () => {
  it("can discriminate by type field", () => {
    const ir: SchemaIR = { type: "string", checks: [] };
    if (ir.type === "string") {
      expectTypeOf(ir).toEqualTypeOf<StringIR>();
    }
  });

  it("discriminates all schema types", () => {
    function processIR(ir: SchemaIR): string {
      switch (ir.type) {
        case "string":
          return `string(${ir.checks.length} checks)`;
        case "number":
          return `number(${ir.checks.length} checks)`;
        case "boolean":
          return "boolean";
        case "null":
          return "null";
        case "undefined":
          return "undefined";
        case "literal":
          return `literal(${ir.values.join(",")})`;
        case "enum":
          return `enum(${ir.values.join(",")})`;
        case "object":
          return `object(${Object.keys(ir.properties).join(",")})`;
        case "array":
          return `array(${ir.element.type})`;
        case "union":
          return `union(${ir.options.length})`;
        case "optional":
          return `optional(${ir.inner.type})`;
        case "nullable":
          return `nullable(${ir.inner.type})`;
        case "fallback":
          return `fallback(${ir.reason})`;
      }
    }

    expect(processIR({ type: "string", checks: [] })).toBe("string(0 checks)");
    expect(processIR({ type: "number", checks: [] })).toBe("number(0 checks)");
    expect(processIR({ type: "boolean" })).toBe("boolean");
    expect(processIR({ type: "null" })).toBe("null");
    expect(processIR({ type: "undefined" })).toBe("undefined");
    expect(processIR({ type: "literal", values: ["a", "b"] })).toBe("literal(a,b)");
    expect(processIR({ type: "enum", values: ["x", "y"] })).toBe("enum(x,y)");
    expect(processIR({ type: "object", properties: { x: { type: "string", checks: [] } } })).toBe(
      "object(x)",
    );
    expect(
      processIR({
        type: "array",
        element: { type: "number", checks: [] },
        checks: [],
      }),
    ).toBe("array(number)");
    expect(
      processIR({
        type: "union",
        options: [
          { type: "string", checks: [] },
          { type: "number", checks: [] },
        ],
      }),
    ).toBe("union(2)");
    expect(processIR({ type: "optional", inner: { type: "string", checks: [] } })).toBe(
      "optional(string)",
    );
    expect(processIR({ type: "nullable", inner: { type: "string", checks: [] } })).toBe(
      "nullable(string)",
    );
    expect(processIR({ type: "fallback", reason: "transform" })).toBe("fallback(transform)");
  });
});

// ─── CheckIR Type Discrimination ────────────────────────────────────────────

describe("CheckIR — type discrimination", () => {
  it("discriminates all check types", () => {
    function processCheck(check: CheckIR): string {
      switch (check.kind) {
        case "min_length":
          return `min_length(${check.minimum})`;
        case "max_length":
          return `max_length(${check.maximum})`;
        case "length_equals":
          return `length_equals(${check.length})`;
        case "greater_than":
          return `greater_than(${check.value}, inclusive=${check.inclusive})`;
        case "less_than":
          return `less_than(${check.value}, inclusive=${check.inclusive})`;
        case "multiple_of":
          return `multiple_of(${check.value})`;
        case "number_format":
          return `number_format(${check.format})`;
        case "string_format":
          return `string_format(${check.format})`;
      }
    }

    expect(processCheck({ kind: "min_length", minimum: 3 })).toBe("min_length(3)");
    expect(processCheck({ kind: "max_length", maximum: 50 })).toBe("max_length(50)");
    expect(processCheck({ kind: "length_equals", length: 10 })).toBe("length_equals(10)");
    expect(processCheck({ kind: "greater_than", value: 0, inclusive: true })).toBe(
      "greater_than(0, inclusive=true)",
    );
    expect(processCheck({ kind: "less_than", value: 100, inclusive: false })).toBe(
      "less_than(100, inclusive=false)",
    );
    expect(processCheck({ kind: "multiple_of", value: 5 })).toBe("multiple_of(5)");
    expect(processCheck({ kind: "number_format", format: "safeint" })).toBe(
      "number_format(safeint)",
    );
    expect(processCheck({ kind: "string_format", format: "email" })).toBe("string_format(email)");
  });
});

// ─── CompiledSchema Interface Types ─────────────────────────────────────────

describe("CompiledSchema — type correctness", () => {
  it("parse returns T", () => {
    type TestCompiled = CompiledSchema<{ name: string; age: number }>;
    expectTypeOf<TestCompiled["parse"]>().toBeFunction();
    expectTypeOf<ReturnType<TestCompiled["parse"]>>().toEqualTypeOf<{
      name: string;
      age: number;
    }>();
  });

  it("safeParse returns SafeParseResult<T>", () => {
    type TestCompiled = CompiledSchema<string>;
    expectTypeOf<ReturnType<TestCompiled["safeParse"]>>().toEqualTypeOf<SafeParseResult<string>>();
  });

  it("is() is a type guard", () => {
    type TestCompiled = CompiledSchema<string>;
    expectTypeOf<TestCompiled["is"]>().toEqualTypeOf<(input: unknown) => input is string>();
  });
});

// ─── SafeParseResult Type Safety ────────────────────────────────────────────

describe("SafeParseResult — type narrowing", () => {
  it("narrows to success branch", () => {
    const result: SafeParseResult<string> = { success: true, data: "hello" };
    if (result.success) {
      expectTypeOf(result).toEqualTypeOf<SafeParseSuccess<string>>();
      expect(result.data).toBe("hello");
    }
  });

  it("narrows to error branch", () => {
    const result: SafeParseResult<string> = {
      success: false,
      error: { issues: [{ code: "invalid_type", path: [], message: "Expected string" }] },
    };
    if (!result.success) {
      expectTypeOf(result).toEqualTypeOf<SafeParseError>();
      expect(result.error.issues).toHaveLength(1);
    }
  });
});

// ─── ZodIssueLike / ZodErrorLike Structure ──────────────────────────────────

describe("ZodIssueLike — structure validation", () => {
  it("allows standard issue codes", () => {
    const issue: ZodIssueLike = {
      code: "invalid_type",
      path: ["user", "name"],
      message: "Expected string, received number",
      expected: "string",
      received: "number",
    };
    expect(issue.code).toBe("invalid_type");
    expect(issue.path).toEqual(["user", "name"]);
  });

  it("allows numeric path segments", () => {
    const issue: ZodIssueLike = {
      code: "invalid_type",
      path: ["items", 0, "name"],
      message: "Expected string",
    };
    expect(issue.path).toEqual(["items", 0, "name"]);
  });
});

describe("ZodErrorLike — structure validation", () => {
  it("has issues array", () => {
    const error: ZodErrorLike = {
      issues: [
        { code: "invalid_type", path: [], message: "Expected string" },
        { code: "too_small", path: ["name"], message: "Too short", minimum: 3 },
      ],
    };
    expect(error.issues).toHaveLength(2);
  });
});

// ─── SchemaIR JSON Serialization ────────────────────────────────────────────

describe("SchemaIR — JSON serialization", () => {
  it("all IR types are JSON-serializable", () => {
    const irs: SchemaIR[] = [
      { type: "string", checks: [{ kind: "min_length", minimum: 1 }] },
      { type: "number", checks: [{ kind: "greater_than", value: 0, inclusive: true }] },
      { type: "boolean" },
      { type: "null" },
      { type: "undefined" },
      { type: "literal", values: ["hello", 42, true, null] },
      { type: "enum", values: ["a", "b", "c"] },
      {
        type: "object",
        properties: {
          name: { type: "string", checks: [] },
          nested: { type: "object", properties: { x: { type: "number", checks: [] } } },
        },
      },
      { type: "array", element: { type: "string", checks: [] }, checks: [] },
      {
        type: "union",
        options: [
          { type: "string", checks: [] },
          { type: "number", checks: [] },
        ],
      },
      { type: "optional", inner: { type: "string", checks: [] } },
      { type: "nullable", inner: { type: "number", checks: [] } },
      { type: "fallback", reason: "transform" },
    ];

    for (const ir of irs) {
      const serialized = JSON.stringify(ir);
      const deserialized = JSON.parse(serialized) as SchemaIR;
      expect(deserialized).toEqual(ir);
    }
  });
});
