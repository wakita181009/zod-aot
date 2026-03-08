// biome-ignore lint/correctness/noNodejsModules: need createRequire to read zod/package.json for version detection
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import type { FallbackEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";

const require = createRequire(import.meta.url);
const zodVersion: string = (require("zod/package.json") as { version: string }).version;
const zodMajorMinor = zodVersion.split(".").slice(0, 2).join(".");

/** True if the installed Zod version is >= the given version string (e.g. "4.1") */
function zodAtLeast(minVersion: string): boolean {
  const [majA = 0, minA = 0] = zodMajorMinor.split(".").map(Number);
  const [majB = 0, minB = 0] = minVersion.split(".").map(Number);
  return majA > majB || (majA === majB && minA >= minB);
}

/**
 * Compile a Zod schema through zod-aot pipeline and return a safeParse function
 * that uses Zod's locale error map for message generation.
 */
function compileForErrorTest(schema: z.ZodType, name = "test") {
  const fallbackEntries: FallbackEntry[] = [];
  const ir = extractSchema(schema, fallbackEntries);
  const result = generateValidator(ir, name, { fallbackCount: fallbackEntries.length });
  // biome-ignore lint/style/noNonNullAssertion: localeError is always set in Zod v4
  const __msg = z.config().localeError!;
  const fallbackSchemas = fallbackEntries.map((e) => e.schema);
  const fn =
    fallbackSchemas.length > 0
      ? new Function("__msg", "__fb", `${result.code}\nreturn ${result.functionName};`)
      : new Function("__msg", `${result.code}\nreturn ${result.functionName};`);
  return (fallbackSchemas.length > 0 ? fn(__msg, fallbackSchemas) : fn(__msg)) as (
    input: unknown,
  ) => {
    success: boolean;
    data?: unknown;
    error?: { issues: Record<string, unknown>[] };
  };
}

/**
 * Strip Zod-internal fields that zod-aot cannot reproduce (e.g. `input` when reportInput is false).
 * Zod v4 deletes `input` by default via finalizeIssue.
 */
function normalizeIssues(issues: Record<string, unknown>[]): Record<string, unknown>[] {
  return issues.map((issue) => {
    const normalized = { ...issue };
    // Remove fields that are Zod-internal or non-deterministic
    delete normalized["input"];
    delete normalized["inst"];
    delete normalized["continue"];
    return normalized;
  });
}

function assertSameErrors(schema: z.ZodType, input: unknown, name = "test") {
  const zodResult = schema.safeParse(input);
  const safeParse = compileForErrorTest(schema, name);
  const aotResult = safeParse(input);

  expect(aotResult.success).toBe(zodResult.success);

  if (!zodResult.success && !aotResult.success) {
    const zodIssues = normalizeIssues(
      zodResult.error.issues as unknown as Record<string, unknown>[],
    );
    const aotIssues = normalizeIssues(aotResult.error?.issues ?? []);
    expect(aotIssues).toEqual(zodIssues);
  }
}

// ─── Type Check Errors ──────────────────────────────────────────────────────

describe("error compat — invalid_type", () => {
  it("string receives number", () => {
    assertSameErrors(z.string(), 42, "str");
  });

  it("string receives null", () => {
    assertSameErrors(z.string(), null, "str");
  });

  it("string receives boolean", () => {
    assertSameErrors(z.string(), true, "str");
  });

  it("string receives undefined", () => {
    assertSameErrors(z.string(), undefined, "str");
  });

  it("number receives string", () => {
    assertSameErrors(z.number(), "hello", "num");
  });

  it("number receives NaN", () => {
    assertSameErrors(z.number(), NaN, "num");
  });

  it("number receives Infinity", () => {
    assertSameErrors(z.number(), Infinity, "num");
  });

  it("boolean receives number", () => {
    assertSameErrors(z.boolean(), 42, "bool");
  });

  it("null receives string", () => {
    assertSameErrors(z.null(), "hello", "nullSchema");
  });

  it("undefined receives string", () => {
    assertSameErrors(z.undefined(), "hello", "undefSchema");
  });

  it("object receives string", () => {
    assertSameErrors(z.object({ a: z.string() }), "not object", "obj");
  });

  it("object receives null", () => {
    assertSameErrors(z.object({ a: z.string() }), null, "obj");
  });

  it("object receives array", () => {
    assertSameErrors(z.object({ a: z.string() }), [1, 2], "obj");
  });

  it("array receives string", () => {
    assertSameErrors(z.array(z.string()), "not array", "arr");
  });

  it("bigint receives number", () => {
    assertSameErrors(z.bigint(), 42, "bi");
  });

  it("date receives string", () => {
    assertSameErrors(z.date(), "not a date", "dt");
  });

  it("number.int() receives float", () => {
    assertSameErrors(z.number().int(), 3.14, "numInt");
  });
});

// ─── String Check Errors ────────────────────────────────────────────────────

describe("error compat — string checks", () => {
  it("min_length", () => {
    assertSameErrors(z.string().min(3), "ab", "strMin");
  });

  it("max_length", () => {
    assertSameErrors(z.string().max(5), "abcdef", "strMax");
  });

  it("length (too short)", () => {
    assertSameErrors(z.string().length(3), "ab", "strLen");
  });

  it("length (too long)", () => {
    assertSameErrors(z.string().length(3), "abcd", "strLen");
  });

  it("email format", () => {
    assertSameErrors(z.email(), "not-an-email", "email");
  });

  it("uuid format", () => {
    assertSameErrors(z.uuid(), "not-a-uuid", "uuid");
  });

  it("url format", () => {
    assertSameErrors(z.url(), "not-a-url", "url");
  });

  it("regex pattern", () => {
    assertSameErrors(z.string().regex(/^[A-Z]+$/), "abc", "regex");
  });
});

// ─── Number Check Errors ────────────────────────────────────────────────────

describe("error compat — number checks", () => {
  it("greater_than inclusive (min)", () => {
    assertSameErrors(z.number().min(5), 4, "numMin");
  });

  it("greater_than exclusive (positive / gt(0))", () => {
    assertSameErrors(z.number().positive(), 0, "numPos");
  });

  it("less_than inclusive (max)", () => {
    assertSameErrors(z.number().max(10), 11, "numMax");
  });

  it("less_than exclusive (negative / lt(0))", () => {
    assertSameErrors(z.number().negative(), 0, "numNeg");
  });

  it("multiple_of", () => {
    assertSameErrors(z.number().multipleOf(3), 7, "numMul");
  });
});

// ─── BigInt Check Errors ────────────────────────────────────────────────────

describe("error compat — bigint checks", () => {
  it("greater_than inclusive", () => {
    assertSameErrors(z.bigint().min(10n), 9n, "biMin");
  });

  it("greater_than exclusive", () => {
    assertSameErrors(z.bigint().positive(), 0n, "biPos");
  });

  it("less_than inclusive", () => {
    assertSameErrors(z.bigint().max(100n), 101n, "biMax");
  });

  it("less_than exclusive", () => {
    assertSameErrors(z.bigint().negative(), 0n, "biNeg");
  });

  it("multiple_of", () => {
    assertSameErrors(z.bigint().multipleOf(3n), 7n, "biMul");
  });
});

// ─── Date Check Errors ──────────────────────────────────────────────────────

describe("error compat — date checks", () => {
  // Zod v4.0-4.2 emits minimum/maximum as Date objects; v4.3+ emits numbers.
  // zod-aot emits numbers (matching v4.3+), so skip these tests on older versions.
  it.skipIf(!zodAtLeast("4.3"))("min date", () => {
    assertSameErrors(z.date().min(new Date("2024-01-01")), new Date("2023-12-31"), "dtMin");
  });

  it.skipIf(!zodAtLeast("4.3"))("max date", () => {
    assertSameErrors(z.date().max(new Date("2024-12-31")), new Date("2025-01-01"), "dtMax");
  });

  it("invalid date", () => {
    assertSameErrors(z.date(), new Date("invalid"), "dtInvalid");
  });
});

// ─── Enum / Literal / Union Errors ──────────────────────────────────────────

describe("error compat — enum", () => {
  it("invalid enum value (string)", () => {
    assertSameErrors(z.enum(["a", "b", "c"]), "d", "enumStr");
  });

  it("invalid enum value (number input)", () => {
    assertSameErrors(z.enum(["a", "b"]), 42, "enumNum");
  });
});

describe("error compat — literal", () => {
  it("invalid literal (string)", () => {
    assertSameErrors(z.literal("hello"), "world", "litStr");
  });

  it("invalid literal (number)", () => {
    assertSameErrors(z.literal(42), 43, "litNum");
  });

  it("invalid literal (boolean)", () => {
    assertSameErrors(z.literal(true), false, "litBool");
  });
});

describe("error compat — union", () => {
  it("invalid union", () => {
    assertSameErrors(z.union([z.string(), z.number()]), true, "union");
  });
});

// ─── Array Check Errors ─────────────────────────────────────────────────────

describe("error compat — array checks", () => {
  it("min length", () => {
    assertSameErrors(z.array(z.string()).min(2), ["a"], "arrMin");
  });

  it("max length", () => {
    assertSameErrors(z.array(z.string()).max(2), ["a", "b", "c"], "arrMax");
  });

  it("exact length (too short)", () => {
    assertSameErrors(z.array(z.string()).length(3), ["a", "b"], "arrLen");
  });

  it("exact length (too long)", () => {
    assertSameErrors(z.array(z.string()).length(3), ["a", "b", "c", "d"], "arrLen");
  });

  it("invalid element type", () => {
    assertSameErrors(z.array(z.number()), [1, "two", 3], "arrElem");
  });
});

// ─── Set Check Errors ───────────────────────────────────────────────────────

describe("error compat — set checks", () => {
  it("type error", () => {
    assertSameErrors(z.set(z.string()), "not a set", "setType");
  });

  // Zod v4.0 omits `inclusive` on set size checks; v4.1+ includes it.
  it.skipIf(!zodAtLeast("4.1"))("min size", () => {
    assertSameErrors(z.set(z.string()).min(2), new Set(["a"]), "setMin");
  });

  it.skipIf(!zodAtLeast("4.1"))("max size", () => {
    assertSameErrors(z.set(z.string()).max(2), new Set(["a", "b", "c"]), "setMax");
  });
});

// ─── Map Check Errors ───────────────────────────────────────────────────────

describe("error compat — map checks", () => {
  it("type error", () => {
    assertSameErrors(z.map(z.string(), z.number()), "not a map", "mapType");
  });
});

// ─── Object Nested Errors ───────────────────────────────────────────────────

describe("error compat — nested object errors", () => {
  it("missing required field", () => {
    assertSameErrors(
      z.object({ name: z.string(), age: z.number() }),
      { name: "Alice" },
      "objMissing",
    );
  });

  it("wrong field type", () => {
    assertSameErrors(
      z.object({ name: z.string(), age: z.number() }),
      { name: 42, age: "not number" },
      "objWrongType",
    );
  });

  it("deep nested error", () => {
    assertSameErrors(
      z.object({ user: z.object({ name: z.string().min(3) }) }),
      { user: { name: "ab" } },
      "objDeep",
    );
  });
});

// ─── Tuple Errors ───────────────────────────────────────────────────────────

describe("error compat — tuple errors", () => {
  it("type error", () => {
    assertSameErrors(z.tuple([z.string(), z.number()]), "not array", "tuple");
  });

  it("wrong element type", () => {
    assertSameErrors(z.tuple([z.string(), z.number()]), [42, "hello"], "tuple");
  });

  it("too few elements", () => {
    assertSameErrors(z.tuple([z.string(), z.number()]), ["hello"], "tuple");
  });
});

// ─── Record Errors ──────────────────────────────────────────────────────────

describe("error compat — record errors", () => {
  it("type error", () => {
    assertSameErrors(z.record(z.string(), z.number()), "not object", "rec");
  });

  it("invalid value type", () => {
    assertSameErrors(z.record(z.string(), z.number()), { a: "not number" }, "rec");
  });
});

// ─── Discriminated Union Errors ─────────────────────────────────────────────

describe("error compat — discriminated union errors", () => {
  const schema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("a"), value: z.string() }),
    z.object({ type: z.literal("b"), count: z.number() }),
  ]);

  it("type error (not object)", () => {
    assertSameErrors(schema, "not object", "du");
  });

  // Zod v4.0 omits `discriminator` field; v4.1+ includes it.
  it.skipIf(!zodAtLeast("4.1"))("invalid discriminator value", () => {
    assertSameErrors(schema, { type: "c" }, "du");
  });

  it("valid discriminator, wrong field type", () => {
    assertSameErrors(schema, { type: "a", value: 42 }, "du");
  });
});

// ─── Intersection Errors ────────────────────────────────────────────────────

describe("error compat — intersection errors", () => {
  it("missing fields from both sides", () => {
    assertSameErrors(
      z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })),
      {},
      "inter",
    );
  });
});

// ─── Combined Schema Errors ─────────────────────────────────────────────────

describe("error compat — combined real-world schemas", () => {
  it("user registration with multiple errors", () => {
    const schema = z.object({
      username: z.string().min(3).max(20),
      email: z.email(),
      age: z.number().int().positive(),
      role: z.enum(["user", "admin"]),
    });

    assertSameErrors(
      schema,
      { username: "ab", email: "not-email", age: -1, role: "superadmin" },
      "userReg",
    );
  });
});
