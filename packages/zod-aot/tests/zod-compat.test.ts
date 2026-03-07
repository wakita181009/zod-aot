import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import { extractSchema } from "#src/core/extractor.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * End-to-end helper: Zod schema → extract IR → generate code → compile → safeParse.
 */
function compileZodSchema(schema: z.ZodType, name = "test") {
  const ir = extractSchema(schema);
  const result = generateValidator(ir, name);
  const fn = new Function(`${result.code}\nreturn ${result.functionName};`);
  return fn() as (input: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { issues: Record<string, unknown>[] };
  };
}

type IssueRecord = Record<string, unknown>;

/**
 * Normalize an issue for comparison.
 * Strips `input` field (Zod v4 sometimes includes it, but it's not stable).
 */
function normalizeIssue(issue: IssueRecord): IssueRecord {
  const { input: _input, ...rest } = issue;
  return rest;
}

/**
 * Assert that zod-aot produces the same error issues as Zod for a failing input.
 * Compares: issues count, order, and each issue's fields (code, path, message, etc.).
 */
function assertErrorCompat(schema: z.ZodType, input: unknown, name = "test") {
  const zodResult = schema.safeParse(input);
  const safeParse = compileZodSchema(schema, name);
  const aotResult = safeParse(input);

  // Both should fail
  expect(zodResult.success).toBe(false);
  expect(aotResult.success).toBe(false);
  if (zodResult.success || aotResult.success) return;

  const zodIssues = zodResult.error.issues.map((i) => normalizeIssue(i as unknown as IssueRecord));
  const aotIssues = (aotResult.error?.issues ?? []).map(normalizeIssue);

  // Same number of issues
  expect(aotIssues).toHaveLength(zodIssues.length);

  // Each issue matches
  for (let i = 0; i < zodIssues.length; i++) {
    expect(aotIssues[i]).toEqual(zodIssues[i]);
  }
}

// ─── Primitive Type Errors ──────────────────────────────────────────────────

describe("zod-compat — primitive type errors", () => {
  const cases: [string, z.ZodType, unknown[]][] = [
    ["string", z.string(), [42, null, undefined, true, {}, []]],
    ["number", z.number(), ["hello", null, undefined, true, {}, []]],
    ["boolean", z.boolean(), [42, "yes", null, undefined, {}, []]],
    ["null", z.null(), [42, "null", undefined, true, {}]],
    ["undefined", z.undefined(), [42, "undefined", null, true, {}]],
  ];

  for (const [label, schema, inputs] of cases) {
    describe(label, () => {
      for (const input of inputs) {
        const inputStr = JSON.stringify(input) ?? String(input);
        it(`${inputStr} error matches Zod`, () => {
          assertErrorCompat(schema, input, label);
        });
      }
    });
  }
});

// ─── String Check Errors ────────────────────────────────────────────────────

describe("zod-compat — string check errors", () => {
  it("min(3) with too-short string", () => {
    assertErrorCompat(z.string().min(3), "ab", "strMin");
  });

  it("min(3) with empty string", () => {
    assertErrorCompat(z.string().min(3), "", "strMin");
  });

  it("max(5) with too-long string", () => {
    assertErrorCompat(z.string().max(5), "abcdef", "strMax");
  });

  it("length(3) with too-short string", () => {
    assertErrorCompat(z.string().length(3), "ab", "strLen");
  });

  it("length(3) with too-long string", () => {
    assertErrorCompat(z.string().length(3), "abcd", "strLen");
  });

  it("email format error", () => {
    assertErrorCompat(z.email(), "not-an-email", "strEmail");
  });

  it("regex format error", () => {
    assertErrorCompat(z.string().regex(/^[A-Z]+$/), "abc", "strRegex");
  });

  it("custom error message on min", () => {
    assertErrorCompat(z.string().min(3, "too short!"), "ab", "strMinCustom");
  });
});

// ─── Number Check Errors ────────────────────────────────────────────────────

describe("zod-compat — number check errors", () => {
  it("type error for string input", () => {
    assertErrorCompat(z.number(), "hello", "numType");
  });

  it("int() rejects float", () => {
    assertErrorCompat(z.number().int(), 3.14, "numInt");
  });

  it("int() rejects NaN", () => {
    assertErrorCompat(z.number().int(), NaN, "numIntNaN");
  });

  it("positive() rejects negative", () => {
    assertErrorCompat(z.number().positive(), -1, "numPos");
  });

  it("positive() rejects zero", () => {
    assertErrorCompat(z.number().positive(), 0, "numPosZero");
  });

  it("min(0).max(100) below range", () => {
    assertErrorCompat(z.number().min(0).max(100), -1, "numRange");
  });

  it("min(0).max(100) above range", () => {
    assertErrorCompat(z.number().min(0).max(100), 101, "numRange");
  });

  it("multipleOf(3) error", () => {
    assertErrorCompat(z.number().multipleOf(3), 5, "numMul");
  });
});

// ─── Object Errors ──────────────────────────────────────────────────────────

describe("zod-compat — object errors", () => {
  it("type error for non-object", () => {
    assertErrorCompat(z.object({ name: z.string() }), 42, "objType");
  });

  it("type error for null", () => {
    assertErrorCompat(z.object({ name: z.string() }), null, "objNull");
  });

  it("type error for array", () => {
    assertErrorCompat(z.object({ name: z.string() }), [1, 2], "objArr");
  });

  it("missing property", () => {
    assertErrorCompat(
      z.object({ name: z.string(), age: z.number() }),
      { name: "Alice" },
      "objMissing",
    );
  });

  it("wrong property type", () => {
    assertErrorCompat(
      z.object({ name: z.string(), age: z.number() }),
      { name: 42, age: "thirty" },
      "objWrongType",
    );
  });

  it("nested object path", () => {
    assertErrorCompat(
      z.object({ user: z.object({ name: z.string() }) }),
      { user: { name: 42 } },
      "objNested",
    );
  });

  it("deeply nested path", () => {
    assertErrorCompat(
      z.object({
        a: z.object({ b: z.object({ c: z.string() }) }),
      }),
      { a: { b: { c: 42 } } },
      "objDeep",
    );
  });
});

// ─── Array Errors ───────────────────────────────────────────────────────────

describe("zod-compat — array errors", () => {
  it("type error for non-array", () => {
    assertErrorCompat(z.array(z.string()), "not array", "arrType");
  });

  it("element type error with correct path", () => {
    assertErrorCompat(z.array(z.string()), ["a", 42, "c"], "arrElem");
  });

  it("multiple element errors", () => {
    assertErrorCompat(z.array(z.number()), ["a", "b", "c"], "arrMulti");
  });

  it("min(2) too few items", () => {
    assertErrorCompat(z.array(z.string()).min(2), ["a"], "arrMin");
  });

  it("max(1) too many items", () => {
    assertErrorCompat(z.array(z.string()).max(1), ["a", "b"], "arrMax");
  });
});

// ─── Literal Errors ─────────────────────────────────────────────────────────

describe("zod-compat — literal errors", () => {
  it("string literal mismatch", () => {
    assertErrorCompat(z.literal("hello"), "world", "litStr");
  });

  it("number literal mismatch", () => {
    assertErrorCompat(z.literal(42), 43, "litNum");
  });

  it("boolean literal mismatch", () => {
    assertErrorCompat(z.literal(true), false, "litBool");
  });
});

// ─── Enum Errors ────────────────────────────────────────────────────────────

describe("zod-compat — enum errors", () => {
  it("invalid enum value", () => {
    assertErrorCompat(z.enum(["admin", "user", "guest"]), "superadmin", "enumErr");
  });

  it("wrong type for enum", () => {
    assertErrorCompat(z.enum(["a", "b", "c"]), 42, "enumType");
  });
});

// ─── Union Errors ───────────────────────────────────────────────────────────

describe("zod-compat — union errors", () => {
  it("no branch matches", () => {
    assertErrorCompat(z.union([z.string(), z.number()]), true, "unionErr");
  });

  it("union with checks — all branches fail", () => {
    assertErrorCompat(z.union([z.string().min(3), z.number().positive()]), true, "unionChecks");
  });
});

// ─── Optional / Nullable Errors ─────────────────────────────────────────────

describe("zod-compat — optional/nullable errors", () => {
  it("optional string rejects null", () => {
    assertErrorCompat(z.string().optional(), null, "optStr");
  });

  it("optional string rejects number", () => {
    assertErrorCompat(z.string().optional(), 42, "optStrNum");
  });

  it("nullable string rejects undefined", () => {
    assertErrorCompat(z.string().nullable(), undefined, "nullStr");
  });

  it("nullable string rejects number", () => {
    assertErrorCompat(z.string().nullable(), 42, "nullStrNum");
  });
});

// ─── Tuple Errors ───────────────────────────────────────────────────────────

describe("zod-compat — tuple errors", () => {
  it("type error for non-array", () => {
    assertErrorCompat(z.tuple([z.string(), z.number()]), "not array", "tupleType");
  });

  it("too few elements", () => {
    assertErrorCompat(z.tuple([z.string(), z.number()]), ["a"], "tupleShort");
  });

  it("wrong element type", () => {
    assertErrorCompat(z.tuple([z.string(), z.number()]), [42, "hello"], "tupleWrong");
  });
});

// ─── Record Errors ──────────────────────────────────────────────────────────

describe("zod-compat — record errors", () => {
  it("type error for non-object", () => {
    assertErrorCompat(z.record(z.string(), z.number()), "not object", "recType");
  });

  it("value type error with correct path", () => {
    assertErrorCompat(z.record(z.string(), z.number()), { a: "not number" }, "recValue");
  });

  it("multiple value errors", () => {
    assertErrorCompat(z.record(z.string(), z.number()), { a: "bad", b: "also bad" }, "recMulti");
  });
});

// ─── Date Errors ────────────────────────────────────────────────────────────

describe("zod-compat — date errors", () => {
  it("type error for non-date", () => {
    assertErrorCompat(z.date(), "not a date", "dateType");
  });

  it("invalid date", () => {
    assertErrorCompat(z.date(), new Date("invalid"), "dateInvalid");
  });

  it("date min check", () => {
    assertErrorCompat(z.date().min(new Date("2025-01-01")), new Date("2024-01-01"), "dateMin");
  });

  it("date max check", () => {
    assertErrorCompat(z.date().max(new Date("2020-01-01")), new Date("2025-01-01"), "dateMax");
  });
});

// ─── BigInt Errors ──────────────────────────────────────────────────────────

describe("zod-compat — bigint errors", () => {
  it("type error for non-bigint", () => {
    assertErrorCompat(z.bigint(), 42, "bigintType");
  });

  it("min check", () => {
    assertErrorCompat(z.bigint().min(10n), 5n, "bigintMin");
  });

  it("max check", () => {
    assertErrorCompat(z.bigint().max(10n), 15n, "bigintMax");
  });

  it("positive rejects zero", () => {
    assertErrorCompat(z.bigint().positive(), 0n, "bigintPos");
  });

  it("multipleOf error", () => {
    assertErrorCompat(z.bigint().multipleOf(3n), 5n, "bigintMul");
  });
});

// ─── Set Errors ─────────────────────────────────────────────────────────────

describe("zod-compat — set errors", () => {
  it("type error for non-set", () => {
    assertErrorCompat(z.set(z.string()), "not a set", "setType");
  });

  it("element type error", () => {
    assertErrorCompat(z.set(z.string()), new Set([1, 2]), "setElem");
  });

  it("min size check", () => {
    assertErrorCompat(z.set(z.number()).min(2), new Set([1]), "setMin");
  });

  it("max size check", () => {
    assertErrorCompat(z.set(z.number()).max(1), new Set([1, 2]), "setMax");
  });
});

// ─── Map Errors ─────────────────────────────────────────────────────────────

describe("zod-compat — map errors", () => {
  it("type error for non-map", () => {
    assertErrorCompat(z.map(z.string(), z.number()), "not a map", "mapType");
  });

  it("key type error", () => {
    assertErrorCompat(
      z.map(z.number(), z.string()),
      new Map([["bad", "val"]]) as unknown as Map<number, string>,
      "mapKey",
    );
  });

  it("value type error", () => {
    assertErrorCompat(
      z.map(z.string(), z.number()),
      new Map([["key", "not num"]]) as unknown as Map<string, number>,
      "mapVal",
    );
  });
});

// ─── Discriminated Union Errors ─────────────────────────────────────────────

describe("zod-compat — discriminatedUnion errors", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("a"), value: z.string() }),
    z.object({ type: z.literal("b"), count: z.number() }),
  ]);

  it("invalid discriminator value", () => {
    assertErrorCompat(schema, { type: "c" }, "discUnion");
  });

  it("valid discriminator but wrong property type", () => {
    assertErrorCompat(schema, { type: "a", value: 42 }, "discUnionProp");
  });

  it("non-object input", () => {
    assertErrorCompat(schema, "not object", "discUnionType");
  });
});

// ─── Intersection Errors ────────────────────────────────────────────────────

describe("zod-compat — intersection errors", () => {
  it("missing properties from both sides", () => {
    assertErrorCompat(
      z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })),
      {},
      "intersectMissing",
    );
  });

  it("wrong types on both sides", () => {
    assertErrorCompat(
      z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })),
      { a: 42, b: "bad" },
      "intersectWrong",
    );
  });
});

// ─── Pipe Errors ────────────────────────────────────────────────────────────

describe("zod-compat — pipe errors", () => {
  it("input type error", () => {
    assertErrorCompat(z.string().pipe(z.string().min(3)), 42, "pipeIn");
  });

  it("output check error", () => {
    assertErrorCompat(z.string().pipe(z.string().min(5)), "ab", "pipeOut");
  });
});

// ─── Multiple Issues in Single Schema ───────────────────────────────────────

describe("zod-compat — multiple issues", () => {
  it("object with multiple invalid properties", () => {
    assertErrorCompat(
      z.object({ a: z.string(), b: z.number(), c: z.boolean() }),
      { a: 42, b: "x", c: "y" },
      "multiIssue",
    );
  });

  it("issues count matches Zod", () => {
    const schema = z.object({
      name: z.string().min(3),
      age: z.number().int().positive(),
      email: z.email(),
    });
    const input = { name: 42, age: "bad", email: false };
    const zodResult = schema.safeParse(input);
    const safeParse = compileZodSchema(schema, "multiCount");
    const aotResult = safeParse(input);

    expect(zodResult.success).toBe(false);
    expect(aotResult.success).toBe(false);
    if (!zodResult.success && !aotResult.success) {
      expect(aotResult.error?.issues).toHaveLength(zodResult.error.issues.length);
    }
  });
});

// ─── Real-World Schema Error Compat ─────────────────────────────────────────

describe("zod-compat — real-world schema errors", () => {
  const userSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.email(),
    password: z.string().min(8),
    age: z.number().int().positive(),
    role: z.enum(["user", "admin"]),
    newsletter: z.boolean(),
  });

  it("all fields have wrong types", () => {
    assertErrorCompat(
      userSchema,
      {
        username: 42,
        email: false,
        password: null,
        age: "old",
        role: "superadmin",
        newsletter: "yes",
      },
      "userAllWrong",
    );
  });

  it("failed checks (correct types, wrong values)", () => {
    assertErrorCompat(
      userSchema,
      {
        username: "ab",
        email: "not-email",
        password: "short",
        age: -1,
        role: "superadmin",
        newsletter: true,
      },
      "userChecks",
    );
  });

  it("missing required fields", () => {
    assertErrorCompat(userSchema, {}, "userMissing");
  });

  it("API response with invalid nested data", () => {
    const apiSchema = z.object({
      status: z.enum(["success", "error"]),
      data: z.object({
        items: z.array(
          z.object({
            id: z.number().int().positive(),
            title: z.string().min(1),
          }),
        ),
      }),
    });

    assertErrorCompat(
      apiSchema,
      {
        status: "success",
        data: {
          items: [{ id: "not-number", title: "" }],
        },
      },
      "apiNested",
    );
  });
});
