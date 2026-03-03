import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidator } from "#src/codegen/index.js";
import { extractSchema } from "#src/extractor/index.js";
import type { SchemaIR } from "#src/types.js";

/**
 * End-to-end helper: Zod schema → extract IR → generate code → compile → safeParse.
 * Returns a safeParse function from the generated code.
 */
function compileZodSchema(schema: z.ZodType, name = "test") {
  const ir = extractSchema(schema);
  const result = generateValidator(ir, name);
  const fn = new Function(`${result.code}\nreturn ${result.functionName};`);
  return fn() as (input: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } };
}

/**
 * Property-based comparison: same input should produce the same success/failure
 * result in both Zod and the generated validator.
 */
function assertSameResult(schema: z.ZodType, input: unknown, name = "test") {
  const zodResult = schema.safeParse(input);
  const safeParse = compileZodSchema(schema, name);
  const aotResult = safeParse(input);

  expect(aotResult.success).toBe(zodResult.success);
  if (zodResult.success) {
    expect(aotResult.data).toEqual(zodResult.data);
  }
}

// ─── Primitive Compatibility ────────────────────────────────────────────────

describe("integration — primitive schemas match Zod", () => {
  const primitiveTests: [string, z.ZodType, unknown[]][] = [
    ["string", z.string(), ["hello", "", "日本語", 42, null, undefined, true, {}, []]],
    ["number", z.number(), [0, 42, -1, 3.14, NaN, Infinity, "42", null, undefined, true]],
    ["boolean", z.boolean(), [true, false, 0, 1, "true", null, undefined]],
    ["null", z.null(), [null, undefined, 0, "", false]],
    ["undefined", z.undefined(), [undefined, null, 0, "", false]],
  ];

  for (const [label, schema, inputs] of primitiveTests) {
    describe(label, () => {
      for (const input of inputs) {
        const inputStr = JSON.stringify(input) ?? String(input);
        it(`${inputStr} → same result as Zod`, () => {
          assertSameResult(schema, input, label);
        });
      }
    });
  }
});

// ─── String Checks Compatibility ────────────────────────────────────────────

describe("integration — string check schemas match Zod", () => {
  it("min(3) boundary values", () => {
    const schema = z.string().min(3);
    for (const input of ["", "ab", "abc", "abcd", 42, null]) {
      assertSameResult(schema, input, "strMin");
    }
  });

  it("max(5) boundary values", () => {
    const schema = z.string().max(5);
    for (const input of ["", "abcde", "abcdef", 42]) {
      assertSameResult(schema, input, "strMax");
    }
  });

  it("length(3) exact", () => {
    const schema = z.string().length(3);
    for (const input of ["abc", "ab", "abcd", ""]) {
      assertSameResult(schema, input, "strLen");
    }
  });

  it("regex pattern", () => {
    const schema = z.string().regex(/^[A-Z]{3}$/);
    for (const input of ["ABC", "abc", "AB", "ABCD", ""]) {
      assertSameResult(schema, input, "strRegex");
    }
  });

  it("email format", () => {
    const schema = z.email();
    for (const input of [
      "user@example.com",
      "a@b.co",
      "test.name+tag@domain.org",
      "not-an-email",
      "@missing-local.com",
      "missing-domain@",
      "",
      42,
    ]) {
      assertSameResult(schema, input, "strEmail");
    }
  });
});

// ─── Number Checks Compatibility ────────────────────────────────────────────

describe("integration — number check schemas match Zod", () => {
  it("int() boundary values", () => {
    const schema = z.number().int();
    for (const input of [0, 1, -1, 42, 3.14, -0.5, NaN, Infinity, "1"]) {
      assertSameResult(schema, input, "numInt");
    }
  });

  it("positive() boundary values", () => {
    const schema = z.number().positive();
    for (const input of [1, 0.001, 0, -1, -0.001, NaN]) {
      assertSameResult(schema, input, "numPos");
    }
  });

  it("min(0).max(100) range", () => {
    const schema = z.number().min(0).max(100);
    for (const input of [-1, -0.001, 0, 50, 100, 100.001, 101, NaN]) {
      assertSameResult(schema, input, "numRange");
    }
  });

  it("multipleOf(3)", () => {
    const schema = z.number().multipleOf(3);
    for (const input of [0, 3, 6, 9, -3, 1, 2, 4, 3.5]) {
      assertSameResult(schema, input, "numMul");
    }
  });

  it("int().positive()", () => {
    const schema = z.number().int().positive();
    for (const input of [1, 42, 0, -1, 3.14, NaN]) {
      assertSameResult(schema, input, "numIntPos");
    }
  });
});

// ─── Object Compatibility ───────────────────────────────────────────────────

describe("integration — object schemas match Zod", () => {
  it("simple object", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const inputs = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
      { name: "", age: 0 },
      { name: "Alice" },
      { age: 30 },
      {},
      { name: 42, age: "thirty" },
      null,
      "not an object",
      42,
    ];
    for (const input of inputs) {
      assertSameResult(schema, input, "simpleObj");
    }
  });

  it("object with optional properties", () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });
    const inputs = [
      { required: "yes" },
      { required: "yes", optional: "also yes" },
      { required: "yes", optional: undefined },
      {},
      { optional: "only optional" },
    ];
    for (const input of inputs) {
      assertSameResult(schema, input, "optObj");
    }
  });

  it("object with nullable properties", () => {
    const schema = z.object({
      name: z.string(),
      nickname: z.string().nullable(),
    });
    const inputs = [
      { name: "Alice", nickname: "Ali" },
      { name: "Alice", nickname: null },
      { name: "Alice" },
      { name: "Alice", nickname: 42 },
    ];
    for (const input of inputs) {
      assertSameResult(schema, input, "nullObj");
    }
  });

  it("nested objects", () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string().min(1),
          age: z.number().int(),
        }),
      }),
    });
    const inputs = [
      { user: { profile: { name: "Alice", age: 30 } } },
      { user: { profile: { name: "", age: 30 } } },
      { user: { profile: { name: "Alice", age: 30.5 } } },
      { user: { profile: {} } },
      { user: {} },
      {},
    ];
    for (const input of inputs) {
      assertSameResult(schema, input, "nestedObj");
    }
  });
});

// ─── Array Compatibility ────────────────────────────────────────────────────

describe("integration — array schemas match Zod", () => {
  it("basic array", () => {
    const schema = z.array(z.string());
    const inputs = [
      [],
      ["a"],
      ["a", "b", "c"],
      [1, 2, 3],
      ["a", 1, "b"],
      "not array",
      null,
      {},
    ];
    for (const input of inputs) {
      assertSameResult(schema, input, "basicArr");
    }
  });

  it("array with min/max", () => {
    const schema = z.array(z.number()).min(1).max(3);
    const inputs = [[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4], ["a"]];
    for (const input of inputs) {
      assertSameResult(schema, input, "arrMinMax");
    }
  });

  it("array of objects", () => {
    const schema = z.array(z.object({ id: z.number(), name: z.string() }));
    const inputs = [
      [],
      [{ id: 1, name: "a" }],
      [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ],
      [{ id: "not number", name: "a" }],
      [{ id: 1 }],
    ];
    for (const input of inputs) {
      assertSameResult(schema, input, "arrObj");
    }
  });
});

// ─── Enum Compatibility ─────────────────────────────────────────────────────

describe("integration — enum schemas match Zod", () => {
  it("string enum", () => {
    const schema = z.enum(["admin", "user", "guest"]);
    const inputs = ["admin", "user", "guest", "superadmin", "", 42, null, undefined];
    for (const input of inputs) {
      assertSameResult(schema, input, "strEnum");
    }
  });
});

// ─── Literal Compatibility ──────────────────────────────────────────────────

describe("integration — literal schemas match Zod", () => {
  it("string literal", () => {
    const schema = z.literal("hello");
    for (const input of ["hello", "world", "", 42, null, undefined]) {
      assertSameResult(schema, input, "strLit");
    }
  });

  it("number literal", () => {
    const schema = z.literal(42);
    for (const input of [42, 43, 0, "42", null]) {
      assertSameResult(schema, input, "numLit");
    }
  });

  it("boolean literal", () => {
    const schema = z.literal(true);
    for (const input of [true, false, 1, "true", null]) {
      assertSameResult(schema, input, "boolLit");
    }
  });
});

// ─── Union Compatibility ────────────────────────────────────────────────────

describe("integration — union schemas match Zod", () => {
  it("string | number union", () => {
    const schema = z.union([z.string(), z.number()]);
    for (const input of ["hello", 42, true, null, undefined, {}, []]) {
      assertSameResult(schema, input, "strNumUnion");
    }
  });

  it("union with checks", () => {
    const schema = z.union([z.string().min(3), z.number().positive()]);
    for (const input of ["abc", "ab", 1, 0, -1, true, null]) {
      assertSameResult(schema, input, "checkedUnion");
    }
  });
});

// ─── Optional / Nullable Compatibility ──────────────────────────────────────

describe("integration — optional/nullable match Zod", () => {
  it("optional string", () => {
    const schema = z.string().optional();
    for (const input of ["hello", "", undefined, null, 42]) {
      assertSameResult(schema, input, "optStr");
    }
  });

  it("nullable string", () => {
    const schema = z.string().nullable();
    for (const input of ["hello", "", null, undefined, 42]) {
      assertSameResult(schema, input, "nullStr");
    }
  });

  it("optional nullable string", () => {
    const schema = z.string().nullable().optional();
    for (const input of ["hello", "", null, undefined, 42]) {
      assertSameResult(schema, input, "optNullStr");
    }
  });
});

// ─── Real-World Schema Compatibility ────────────────────────────────────────

describe("integration — real-world schemas match Zod", () => {
  it("user registration form", () => {
    const schema = z.object({
      username: z.string().min(3).max(20),
      email: z.email(),
      password: z.string().min(8),
      age: z.number().int().positive(),
      role: z.enum(["user", "admin"]),
      newsletter: z.boolean(),
      referral: z.string().optional(),
    });

    const validInputs = [
      {
        username: "alice",
        email: "alice@test.com",
        password: "securepassword",
        age: 25,
        role: "user",
        newsletter: true,
      },
      {
        username: "bob_admin",
        email: "bob@company.org",
        password: "12345678",
        age: 30,
        role: "admin",
        newsletter: false,
        referral: "alice",
      },
    ];

    const invalidInputs = [
      // Missing fields
      { username: "alice" },
      // Bad types
      {
        username: 42,
        email: "alice@test.com",
        password: "securepassword",
        age: 25,
        role: "user",
        newsletter: true,
      },
      // Failed checks
      {
        username: "ab",
        email: "not-email",
        password: "short",
        age: -1,
        role: "superadmin",
        newsletter: "yes",
      },
      // null
      null,
      // not an object
      "string input",
    ];

    for (const input of [...validInputs, ...invalidInputs]) {
      assertSameResult(schema, input, "userReg");
    }
  });

  it("API response schema", () => {
    const schema = z.object({
      status: z.enum(["success", "error"]),
      data: z
        .object({
          items: z.array(
            z.object({
              id: z.number().int().positive(),
              title: z.string().min(1).max(200),
              tags: z.array(z.string()),
              published: z.boolean(),
            }),
          ),
          total: z.number().int().nonnegative(),
          page: z.number().int().positive(),
        })
        .optional(),
      error: z
        .object({
          code: z.string(),
          message: z.string(),
        })
        .optional(),
    });

    const inputs = [
      // Valid success response
      {
        status: "success",
        data: {
          items: [{ id: 1, title: "Hello", tags: ["a"], published: true }],
          total: 1,
          page: 1,
        },
      },
      // Valid error response
      {
        status: "error",
        error: { code: "NOT_FOUND", message: "Resource not found" },
      },
      // Valid with empty items
      {
        status: "success",
        data: { items: [], total: 0, page: 1 },
      },
      // Invalid: bad status
      { status: "pending" },
      // Invalid: bad item
      {
        status: "success",
        data: {
          items: [{ id: "not-number", title: "", tags: 42, published: "yes" }],
          total: -1,
          page: 0,
        },
      },
    ];

    for (const input of inputs) {
      assertSameResult(schema, input, "apiResp");
    }
  });
});

// ─── Fallback Behavior ──────────────────────────────────────────────────────

describe("integration — fallback for non-compilable schemas", () => {
  it("transform schema produces fallback IR", () => {
    const schema = z.string().transform((v) => parseInt(v, 10));
    const ir = extractSchema(schema);
    expect(ir.type).toBe("fallback");
  });

  it("refine schema produces fallback IR", () => {
    const schema = z.string().refine((v) => v.length > 0);
    const ir = extractSchema(schema);
    expect(ir.type).toBe("fallback");
  });
});

// ─── SchemaIR Roundtrip ─────────────────────────────────────────────────────

describe("integration — SchemaIR is JSON-serializable", () => {
  it("extracted IR survives JSON roundtrip", () => {
    const schema = z.object({
      name: z.string().min(1).max(100),
      age: z.number().int().positive(),
      role: z.enum(["admin", "user"]),
      tags: z.array(z.string()),
      active: z.boolean(),
      extra: z.string().optional(),
    });

    const ir = extractSchema(schema);
    const serialized = JSON.stringify(ir);
    const deserialized = JSON.parse(serialized) as SchemaIR;
    expect(deserialized).toEqual(ir);

    // The deserialized IR should produce the same validator
    const result1 = generateValidator(ir, "original");
    const result2 = generateValidator(deserialized, "roundtrip");
    expect(result1.code).toBe(result2.code);
  });
});
