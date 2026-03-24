import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import type { FallbackEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { SafeParseResult, SchemaIR } from "#src/core/types.js";

/**
 * End-to-end helper: Zod schema → extract IR → generate code → compile → safeParse.
 * Returns a safeParse function from the generated code.
 */
function compileZodSchema(schema: z.ZodType, name = "test") {
  const ir = extractSchema(schema);
  const result = generateValidator(ir, name);
  const fn = new Function(`${result.code}\nreturn ${result.functionDef};`);
  return fn() as (input: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { issues: unknown[] };
  };
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
    ["void", z.void(), [undefined, null, 0, "", false]],
    ["nan", z.nan(), [NaN, 0, 42, Infinity, "NaN", null, undefined]],
    ["never", z.never(), [undefined, null, 0, "", true, {}, []]],
    ["symbol", z.symbol(), [Symbol("test"), Symbol.for("x"), "symbol", 42, null, undefined]],
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
    const inputs = [[], ["a"], ["a", "b", "c"], [1, 2, 3], ["a", 1, "b"], "not array", null, {}];
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

  it("lazy wrapping non-recursive schema is fully compiled", () => {
    const schema = z.lazy(() => z.string());
    const ir = extractSchema(schema);
    expect(ir.type).toBe("string");
  });

  it("recursive lazy falls back only at the recursion point", () => {
    const TreeNode: z.ZodType = z.object({
      value: z.string(),
      children: z.array(z.lazy(() => TreeNode)),
    });
    const ir = extractSchema(TreeNode);
    expect(ir.type).toBe("object");
  });
});

// ─── Tier 2: any / unknown Compatibility ────────────────────────────────────

describe("integration — any/unknown match Zod", () => {
  it("any accepts everything", () => {
    const schema = z.any();
    for (const input of ["hello", 42, null, undefined, {}, [], true]) {
      assertSameResult(schema, input, "anySchema");
    }
  });

  it("unknown accepts everything", () => {
    const schema = z.unknown();
    for (const input of ["hello", 42, null, undefined, {}, [], true]) {
      assertSameResult(schema, input, "unknownSchema");
    }
  });
});

// ─── Tier 2: readonly Compatibility ─────────────────────────────────────────

describe("integration — readonly match Zod", () => {
  it("readonly string", () => {
    const schema = z.string().readonly();
    for (const input of ["hello", "", 42, null, undefined]) {
      assertSameResult(schema, input, "roStr");
    }
  });

  it("readonly object", () => {
    const schema = z.object({ name: z.string() }).readonly();
    for (const input of [{ name: "Alice" }, {}, null, "not object"]) {
      assertSameResult(schema, input, "roObj");
    }
  });
});

// ─── Tier 2: date Compatibility ─────────────────────────────────────────────

describe("integration — date match Zod", () => {
  it("plain date", () => {
    const schema = z.date();
    for (const input of [new Date(), new Date("2024-01-01"), "2024-01-01", 123, null]) {
      assertSameResult(schema, input, "dateSchema");
    }
  });

  it("date with min/max", () => {
    const schema = z.date().min(new Date("2020-01-01")).max(new Date("2030-01-01"));
    for (const input of [
      new Date("2025-01-01"),
      new Date("2020-01-01"),
      new Date("2030-01-01"),
      new Date("2019-12-31"),
      new Date("2030-01-02"),
    ]) {
      assertSameResult(schema, input, "dateMinMax");
    }
  });

  it("rejects invalid date", () => {
    const schema = z.date();
    assertSameResult(schema, new Date("invalid"), "dateInvalid");
  });
});

// ─── Tier 2: tuple Compatibility ────────────────────────────────────────────

describe("integration — tuple match Zod", () => {
  it("basic tuple", () => {
    const schema = z.tuple([z.string(), z.number()]);
    for (const input of [["hello", 42], ["a", 1], [42, "hello"], ["a"], "not array", null]) {
      assertSameResult(schema, input, "tupleBasic");
    }
  });

  it("tuple with rest", () => {
    const schema = z.tuple([z.string()]).rest(z.number());
    for (const input of [["a"], ["a", 1], ["a", 1, 2, 3], ["a", "b"]]) {
      assertSameResult(schema, input, "tupleRest");
    }
  });
});

// ─── Tier 2: record Compatibility ───────────────────────────────────────────

describe("integration — record match Zod", () => {
  it("string key record", () => {
    const schema = z.record(z.string(), z.number());
    for (const input of [{}, { a: 1 }, { a: 1, b: 2 }, { a: "not number" }, null, "not object"]) {
      assertSameResult(schema, input, "recordStr");
    }
  });

  it("key constraint record produces invalid_key like Zod", () => {
    const schema = z.record(z.string().min(3), z.number());
    const safeParse = compileZodSchema(schema, "recordKeyMin");

    // Invalid key
    const aotResult = safeParse({ ab: 1 });
    const zodResult = schema.safeParse({ ab: 1 });
    expect(aotResult.success).toBe(zodResult.success);
    expect(aotResult.error?.issues.length).toBe(zodResult.error?.issues.length);
    expect((aotResult.error?.issues[0] as Record<string, unknown>)?.["code"]).toBe("invalid_key");

    // Invalid key + invalid value: Zod short-circuits (only key error)
    const aotResult2 = safeParse({ ab: "not-number" });
    const zodResult2 = schema.safeParse({ ab: "not-number" });
    expect(aotResult2.success).toBe(zodResult2.success);
    expect(aotResult2.error?.issues.length).toBe(zodResult2.error?.issues.length);
  });
});

// ─── Tier 2: default Compatibility ──────────────────────────────────────────

describe("integration — default match Zod", () => {
  it("standalone default", () => {
    const schema = z.string().default("fallback");
    for (const input of [undefined, "hello", ""]) {
      assertSameResult(schema, input, "defaultStr");
    }
  });

  it("default in object property", () => {
    const schema = z.object({
      name: z.string(),
      role: z.string().default("user"),
    });
    for (const input of [
      { name: "Alice", role: "admin" },
      { name: "Bob" },
      { name: "Carol", role: undefined },
    ]) {
      assertSameResult(schema, input, "defaultObj");
    }
  });
});

// ─── Tier 2: intersection Compatibility ─────────────────────────────────────

describe("integration — intersection match Zod", () => {
  it("object intersection", () => {
    const schema = z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() }));
    for (const input of [{ a: "hello", b: 42 }, { a: "hello" }, { b: 42 }, {}, null]) {
      assertSameResult(schema, input, "intersect");
    }
  });
});

// ─── Tier 2: discriminatedUnion Compatibility ───────────────────────────────

describe("integration — discriminatedUnion match Zod", () => {
  it("basic discriminated union", () => {
    const schema = z.discriminatedUnion("type", [
      z.object({ type: z.literal("a"), value: z.string() }),
      z.object({ type: z.literal("b"), count: z.number() }),
    ]);
    for (const input of [
      { type: "a", value: "hello" },
      { type: "b", count: 42 },
      { type: "a", value: 42 },
      { type: "c" },
      { value: "no type" },
      null,
      "not object",
    ]) {
      assertSameResult(schema, input, "discUnion");
    }
  });

  it("discriminated union with 3 options", () => {
    const schema = z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("circle"), radius: z.number() }),
      z.object({ kind: z.literal("square"), size: z.number() }),
      z.object({ kind: z.literal("rect"), w: z.number(), h: z.number() }),
    ]);
    for (const input of [
      { kind: "circle", radius: 5 },
      { kind: "square", size: 10 },
      { kind: "rect", w: 3, h: 4 },
      { kind: "triangle" },
      { kind: "circle", radius: "not number" },
    ]) {
      assertSameResult(schema, input, "discUnion3");
    }
  });
});

// ─── Tier 3: bigint Compatibility ────────────────────────────────────────────

describe("integration — bigint match Zod", () => {
  it("plain bigint", () => {
    const schema = z.bigint();
    for (const input of [0n, 42n, -1n, 42, "42", null, undefined, true]) {
      assertSameResult(schema, input, "bigintSchema");
    }
  });

  it("bigint with min/max", () => {
    const schema = z.bigint().min(10n).max(100n);
    for (const input of [10n, 50n, 100n, 9n, 101n, 0n]) {
      assertSameResult(schema, input, "bigintMinMax");
    }
  });

  it("bigint positive", () => {
    const schema = z.bigint().positive();
    for (const input of [1n, 100n, 0n, -1n]) {
      assertSameResult(schema, input, "bigintPos");
    }
  });

  it("bigint negative", () => {
    const schema = z.bigint().negative();
    for (const input of [-1n, -100n, 0n, 1n]) {
      assertSameResult(schema, input, "bigintNeg");
    }
  });

  it("bigint nonnegative", () => {
    const schema = z.bigint().nonnegative();
    for (const input of [0n, 1n, -1n]) {
      assertSameResult(schema, input, "bigintNonneg");
    }
  });

  it("bigint multipleOf", () => {
    const schema = z.bigint().multipleOf(3n);
    for (const input of [0n, 3n, 6n, 9n, 1n, 2n, 7n]) {
      assertSameResult(schema, input, "bigintMul");
    }
  });
});

// ─── Tier 3: set Compatibility ───────────────────────────────────────────────

describe("integration — set match Zod", () => {
  it("plain set of strings", () => {
    const schema = z.set(z.string());
    for (const input of [
      new Set(["a", "b"]),
      new Set(),
      new Set([1, 2]),
      ["a", "b"],
      null,
      "not a set",
    ]) {
      assertSameResult(schema, input, "setStr");
    }
  });

  it("set with min/max size", () => {
    const schema = z.set(z.number()).min(1).max(3);
    for (const input of [
      new Set([1]),
      new Set([1, 2, 3]),
      new Set<number>(),
      new Set([1, 2, 3, 4]),
    ]) {
      assertSameResult(schema, input, "setMinMax");
    }
  });

  it("set of objects", () => {
    const schema = z.set(z.object({ id: z.number() }));
    for (const input of [new Set([{ id: 1 }]), new Set([{ id: "bad" }])]) {
      assertSameResult(schema, input, "setObj");
    }
  });
});

// ─── Tier 3: map Compatibility ──────────────────────────────────────────────

describe("integration — map match Zod", () => {
  it("plain map string→number", () => {
    const schema = z.map(z.string(), z.number());
    for (const input of [
      new Map([
        ["a", 1],
        ["b", 2],
      ]),
      new Map(),
      new Map([["a", "bad"]]) as unknown,
      { a: 1 },
      null,
      "not a map",
    ]) {
      assertSameResult(schema, input, "mapStrNum");
    }
  });

  it("map with number keys", () => {
    const schema = z.map(z.number(), z.string());
    for (const input of [
      new Map([
        [1, "a"],
        [2, "b"],
      ]),
      new Map([["bad", "a"]]) as unknown,
    ]) {
      assertSameResult(schema, input, "mapNumStr");
    }
  });

  it("map with object values", () => {
    const schema = z.map(z.string(), z.object({ id: z.number() }));
    for (const input of [new Map([["x", { id: 1 }]]), new Map([["x", { id: "bad" }]]) as unknown]) {
      assertSameResult(schema, input, "mapObj");
    }
  });
});

// ─── Tier 3: pipe (non-transform) Compatibility ─────────────────────────────

describe("integration — pipe (non-transform) match Zod", () => {
  it("string pipe to string with min length", () => {
    const schema = z.string().pipe(z.string().min(3));
    for (const input of ["hello", "ab", "", 42, null]) {
      assertSameResult(schema, input, "pipeStrMin");
    }
  });

  it("number pipe to number with range", () => {
    const schema = z.number().pipe(z.number().min(0).max(100));
    for (const input of [50, 0, 100, -1, 101, "not number"]) {
      assertSameResult(schema, input, "pipeNumRange");
    }
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

// ─── Partial Fallback E2E ──────────────────────────────────────────────────

function compileWithFallbacks(schema: z.ZodType, name = "test") {
  const fallbackEntries: FallbackEntry[] = [];
  const ir = extractSchema(schema, fallbackEntries);
  const result = generateValidator(ir, name, { fallbackCount: fallbackEntries.length });
  const fallbackSchemas = fallbackEntries.map((e) => e.schema);
  return fallbackSchemas.length > 0
    ? (new Function("__fb", `${result.code}\nreturn ${result.functionDef};`)(fallbackSchemas) as (
        input: unknown,
      ) => SafeParseResult<unknown>)
    : (new Function(`${result.code}\nreturn ${result.functionDef};`)() as (
        input: unknown,
      ) => SafeParseResult<unknown>);
}

describe("integration — partial fallback (mixed compilable + non-compilable)", () => {
  it("object with transform property matches Zod success/failure", () => {
    const schema = z.object({
      name: z.string().min(3),
      slug: z.string().transform((v) => v.toLowerCase()),
      age: z.number().int().positive(),
    });

    const safeParse = compileWithFallbacks(schema, "partial");
    const inputs = [
      { name: "Alice", slug: "Hello-World", age: 25 },
      { name: "Al", slug: "hello", age: 25 },
      { name: "Alice", slug: 42, age: 25 },
      { name: "Alice", slug: "hello", age: -1 },
      null,
      "not an object",
    ];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("transform data is written back on success", () => {
    const schema = z.object({
      name: z.string(),
      slug: z.string().transform((v) => v.toLowerCase()),
    });

    const safeParse = compileWithFallbacks(schema, "transform");
    const result = safeParse({ name: "Alice", slug: "HELLO" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", slug: "hello" });
    }
  });

  it("object with refine property matches Zod behavior", () => {
    const schema = z.object({
      email: z.email(),
      password: z
        .string()
        .min(8)
        .refine((v) => /[A-Z]/.test(v), {
          message: "Must contain uppercase",
        }),
    });

    const safeParse = compileWithFallbacks(schema, "refine");
    const inputs = [
      { email: "a@b.com", password: "SecurePass1" },
      { email: "a@b.com", password: "nouppercase" },
      { email: "invalid", password: "SecurePass1" },
    ];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("array of objects with partial fallback", () => {
    const itemSchema = z.object({
      id: z.number(),
      label: z.string().transform((v) => v.trim()),
    });
    const schema = z.array(itemSchema);

    const safeParse = compileWithFallbacks(schema, "arrPartial");
    const inputs = [
      [{ id: 1, label: " hello " }],
      [{ id: "not a number", label: "ok" }],
      [{ id: 1, label: 42 }],
      "not an array",
      [],
    ];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("nullable with transform inner matches Zod", () => {
    const schema = z.object({
      name: z.string(),
      label: z.nullable(z.string().transform((v) => v.trim())),
    });

    const safeParse = compileWithFallbacks(schema, "nullableTransform");
    const inputs = [
      { name: "Alice", label: " hello " },
      { name: "Alice", label: null },
      { name: "Alice", label: 42 },
      null,
    ];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("tuple with transform item matches Zod", () => {
    const schema = z.tuple([z.string(), z.number().transform((v) => String(v))]);

    const safeParse = compileWithFallbacks(schema, "tupleTransform");
    const inputs = [["hello", 42], ["hello", "not a number"], [42, 42], "not array"];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("record with transform value matches Zod", () => {
    const schema = z.record(
      z.string(),
      z.string().transform((v) => v.trim()),
    );

    const safeParse = compileWithFallbacks(schema, "recordTransform");
    const inputs = [{ a: " hello " }, { a: "hello", b: "world" }, { a: 42 }, {}, null];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("intersection with transform side matches Zod", () => {
    const schema = z.intersection(
      z.object({ a: z.string() }),
      z.object({ b: z.string().transform((v) => v.toLowerCase()) }),
    );

    const safeParse = compileWithFallbacks(schema, "intersectTransform");
    const inputs = [{ a: "hello", b: "WORLD" }, { a: "hello" }, { b: "world" }, null];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("deep nested partial fallback matches Zod", () => {
    const schema = z.object({
      items: z.array(
        z.object({
          name: z.string().min(1),
          score: z.number().transform((v) => Math.round(v)),
        }),
      ),
    });

    const safeParse = compileWithFallbacks(schema, "deepNested");
    const inputs = [
      { items: [{ name: "Alice", score: 95.7 }] },
      { items: [{ name: "", score: 80 }] },
      { items: [{ name: "Bob", score: "not a number" }] },
      { items: [] },
      null,
    ];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("nullable transform writes back data on success", () => {
    const schema = z.object({
      label: z.nullable(z.string().transform((v) => v.trim())),
    });

    const safeParse = compileWithFallbacks(schema, "nullableWriteback");
    const result = safeParse({ label: "  hello  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ label: "hello" });
    }
  });

  it("recursive lazy tree node matches Zod success/failure", () => {
    const TreeNode: z.ZodType = z.object({
      value: z.string(),
      children: z.array(z.lazy(() => TreeNode)),
    });

    const safeParse = compileWithFallbacks(TreeNode, "tree");
    const inputs = [
      { value: "root", children: [] },
      { value: "root", children: [{ value: "child", children: [] }] },
      {
        value: "root",
        children: [{ value: "child", children: [{ value: "grandchild", children: [] }] }],
      },
      { value: 42, children: [] },
      { value: "root", children: "not array" },
      null,
    ];

    for (const input of inputs) {
      const zodResult = TreeNode.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("recursive tree with string checks matches Zod", () => {
    const TreeNode: z.ZodType = z.object({
      value: z.string().min(1),
      children: z.array(z.lazy(() => TreeNode)),
    });

    const safeParse = compileWithFallbacks(TreeNode, "treeChecks");
    const inputs = [
      { value: "root", children: [] },
      { value: "root", children: [{ value: "a", children: [] }] },
      // Invalid: empty string violates min(1)
      { value: "", children: [] },
      // Invalid: nested child violates min(1)
      { value: "root", children: [{ value: "", children: [] }] },
    ];

    for (const input of inputs) {
      const zodResult = TreeNode.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("linked list (nullable self-reference) matches Zod", () => {
    const ListNode: z.ZodType = z.object({
      value: z.number(),
      next: z.lazy(() => ListNode).nullable(),
    });

    const safeParse = compileWithFallbacks(ListNode, "list");
    const inputs = [
      { value: 1, next: null },
      { value: 1, next: { value: 2, next: null } },
      { value: 1, next: { value: 2, next: { value: 3, next: null } } },
      // Invalid: bad value
      { value: "bad", next: null },
      // Invalid: nested bad value
      { value: 1, next: { value: "bad", next: null } },
      // Invalid: next is not null or object
      { value: 1, next: "not object" },
      null,
    ];

    for (const input of inputs) {
      const zodResult = ListNode.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("binary tree (multiple nullable self-references) matches Zod", () => {
    const BinaryTree: z.ZodType = z.object({
      value: z.number(),
      left: z.lazy(() => BinaryTree).nullable(),
      right: z.lazy(() => BinaryTree).nullable(),
    });

    const safeParse = compileWithFallbacks(BinaryTree, "btree");
    const inputs = [
      { value: 1, left: null, right: null },
      {
        value: 1,
        left: { value: 2, left: null, right: null },
        right: { value: 3, left: null, right: null },
      },
      {
        value: 1,
        left: {
          value: 2,
          left: { value: 4, left: null, right: null },
          right: null,
        },
        right: null,
      },
      // Invalid: bad value in left subtree
      { value: 1, left: { value: "bad", left: null, right: null }, right: null },
      // Invalid: missing right
      { value: 1, left: null },
    ];

    for (const input of inputs) {
      const zodResult = BinaryTree.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("optional recursive self-reference matches Zod", () => {
    const Category: z.ZodType = z.object({
      name: z.string(),
      parent: z.lazy(() => Category).optional(),
    });

    const safeParse = compileWithFallbacks(Category, "category");
    const inputs = [
      { name: "root" },
      { name: "child", parent: { name: "root" } },
      { name: "grandchild", parent: { name: "child", parent: { name: "root" } } },
      // Invalid: bad name
      { name: 42 },
      // Invalid: bad nested name
      { name: "child", parent: { name: 123 } },
      null,
    ];

    for (const input of inputs) {
      const zodResult = Category.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("recursive record (directory tree) matches Zod", () => {
    const DirNode: z.ZodType = z.object({
      name: z.string(),
      children: z.record(
        z.string(),
        z.lazy(() => DirNode),
      ),
    });

    const safeParse = compileWithFallbacks(DirNode, "dir");
    const inputs = [
      { name: "root", children: {} },
      {
        name: "root",
        children: {
          src: { name: "src", children: {} },
          lib: { name: "lib", children: {} },
        },
      },
      {
        name: "root",
        children: {
          src: {
            name: "src",
            children: {
              core: { name: "core", children: {} },
            },
          },
        },
      },
      // Invalid: child has bad name
      { name: "root", children: { bad: { name: 42, children: {} } } },
      null,
    ];

    for (const input of inputs) {
      const zodResult = DirNode.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("deep recursive tree (4 levels) matches Zod results", () => {
    const TreeNode: z.ZodType = z.object({
      value: z.string(),
      children: z.array(z.lazy(() => TreeNode)),
    });

    const safeParse = compileWithFallbacks(TreeNode, "deepTree");
    const deepTree = {
      value: "L0",
      children: [
        {
          value: "L1",
          children: [
            {
              value: "L2",
              children: [{ value: "L3", children: [{ value: "L4", children: [] }] }],
            },
          ],
        },
      ],
    };

    const zodResult = TreeNode.safeParse(deepTree);
    const aotResult = safeParse(deepTree);
    expect(aotResult.success).toBe(zodResult.success);
    if (aotResult.success && zodResult.success) {
      expect(aotResult.data).toEqual(zodResult.data);
    }
  });

  it("recursive schema error paths match Zod", () => {
    const TreeNode: z.ZodType = z.object({
      value: z.string(),
      children: z.array(z.lazy(() => TreeNode)),
    });

    const safeParse = compileWithFallbacks(TreeNode, "treePaths");
    const input = {
      value: "root",
      children: [
        { value: "ok", children: [] },
        { value: 42, children: [] },
      ],
    };

    const zodResult = TreeNode.safeParse(input);
    const aotResult = safeParse(input);
    expect(aotResult.success).toBe(false);
    expect(zodResult.success).toBe(false);
    if (!aotResult.success && !zodResult.success) {
      expect(aotResult.error.issues[0]?.path).toEqual(zodResult.error.issues[0]?.path);
    }
  });

  it("non-recursive lazy compiles fully without fallback", () => {
    const schema = z.object({
      name: z.lazy(() => z.string().min(1)),
      age: z.number(),
    });

    const safeParse = compileWithFallbacks(schema, "lazySimple");
    const inputs = [{ name: "Alice", age: 30 }, { name: "", age: 30 }, { name: 42, age: 30 }, null];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("schemas without fallbacks still work normally", () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().int().positive(),
    });

    const safeParse = compileWithFallbacks(schema, "noFallback");
    const inputs = [
      { name: "Alice", age: 30 },
      { name: "", age: 30 },
      { name: "Bob", age: -1 },
      null,
    ];

    for (const input of inputs) {
      const zodResult = schema.safeParse(input);
      const aotResult = safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });
});
