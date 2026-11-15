import { describe, expect, it } from "vitest";
import { ZodRealError, z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import type { RefEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import { FIN_DECL } from "#src/core/iife.js";
import type { SafeParseResult, SchemaIR } from "#src/core/types.js";

// Regression tests for checks that used to be dropped or miscompiled instead of
// being compiled faithfully or falling back to Zod (issue #281).

const __fin = new Function("__ZodError", `${FIN_DECL}; return __fin;`)(ZodRealError);

function compile(schema: z.ZodType): {
  ir: SchemaIR;
  safeParse: (input: unknown) => SafeParseResult<unknown>;
} {
  const refs: RefEntry[] = [];
  const ir = extractSchema(schema, refs);
  const result = generateValidator(ir, "parity", { refCount: refs.length });
  const safeParse = new Function(
    "__ZodError",
    "__fin",
    "__rf",
    `${result.code}\nreturn ${result.functionDef};`,
  )(
    ZodRealError,
    __fin,
    refs.map((r) => r.schema),
  );
  return { ir, safeParse };
}

function expectParity(schema: z.ZodType, inputs: unknown[]): SchemaIR {
  const { ir, safeParse } = compile(schema);
  for (const input of inputs) {
    const expected = schema.safeParse(input);
    const actual = safeParse(input);
    expect({ input, success: actual.success }).toEqual({ input, success: expected.success });
    if (expected.success && actual.success) {
      expect(actual.data).toEqual(expected.data);
    }
    if (!expected.success && !actual.success) {
      // Issue order may differ: compiled checks are reordered by cost.
      expect(actual.error.issues.map((i) => i.code).sort()).toEqual(
        expected.error.issues.map((i) => i.code).sort(),
      );
    }
  }
  return ir;
}

describe("format schema with chained checks", () => {
  it("z.int().positive() applies both checks", () => {
    const ir = expectParity(z.int().positive(), [0, 1, -1, 1.5]);
    expect(ir.type).toBe("number");
  });

  it("z.email().max() applies both checks", () => {
    const ir = expectParity(z.email().max(10), ["a@b.co", "user@example.com", "nope"]);
    expect(ir.type).toBe("string");
  });

  it("z.uuid().min() keeps the format check first", () => {
    expectParity(z.uuid().min(40), ["00000000-0000-0000-0000-000000000000", "x"]);
  });
});

describe("overwrite checks", () => {
  it("compiles trim / toLowerCase / toUpperCase", () => {
    expectParity(z.string().trim(), [" x ", "x", ""]);
    expectParity(z.string().toLowerCase(), ["AbC"]);
    expectParity(z.string().toUpperCase(), ["ab"]);
  });

  it("later checks see the rewritten value", () => {
    expectParity(z.string().trim().min(1), ["   ", " a "]);
    expectParity(z.string().min(3).trim(), [" a ", "a"]);
    expectParity(z.string().trim().toUpperCase().startsWith("A"), [" ab", " b"]);
  });

  it("compiles a zero-capture .overwrite()", () => {
    expectParity(
      z.string().overwrite((s) => s.repeat(2)),
      ["ab"],
    );
  });

  it("falls back for a capturing overwrite", () => {
    const form = "NFC";
    const ir = expectParity(
      z.string().overwrite((s) => s.normalize(form)),
      ["é"],
    );
    expect(ir.type).toBe("fallback");
    expectParity(z.string().normalize(), ["é"]);
  });

  it("disables the fast path", () => {
    expect(generateValidator(extractSchema(z.string().trim()), "t").code).not.toContain(
      "typeof input===",
    );
  });

  it("does not mutate the input object", () => {
    const { safeParse } = compile(z.object({ a: z.string().trim(), b: z.url() }));
    const input = { a: " x ", b: " https://a.com " };
    const result = safeParse(input);
    expect(result).toEqual({ success: true, data: { a: "x", b: "https://a.com" } });
    expect(input).toEqual({ a: " x ", b: " https://a.com " });
  });

  it("applies inside arrays and unions", () => {
    expectParity(z.array(z.string().trim()), [[" a", "b "]]);
    expectParity(z.union([z.number(), z.string().trim()]), [" a "]);
  });
});

describe("string formats", () => {
  it("url trims the output like Zod", () => {
    expectParity(z.url(), [" https://a.com ", "https://a.com", "nope"]);
    expectParity(z.url().max(13), [" https://a.com "]);
    expectParity(z.string().max(13).url(), [" https://a.com "]);
  });

  it("url with hostname / protocol / normalize falls back", () => {
    for (const schema of [
      z.url({ hostname: /^x\.com$/ }),
      z.url({ protocol: /^https$/ }),
      z.url({ normalize: true }),
    ]) {
      const ir = expectParity(schema, ["https://a.com", "https://x.com", "http://x.com/a/../b"]);
      expect(ir.type).toBe("fallback");
    }
  });

  it("formats with a non-regex Zod check fall back", () => {
    const cases: [z.ZodType, unknown[]][] = [
      [z.jwt(), ["a", "a.b.c"]],
      [z.ipv6(), ["::ffff:1.2.3.4", "::1", "x"]],
      [z.cidrv6(), ["::1/128", "::1/129"]],
      [z.base64(), ["abc ", "YQ==", "%%%"]],
      [z.base64url(), ["YQ", "Y"]],
      [z.string().ipv6(), ["::ffff:1.2.3.4"]],
    ];
    for (const [schema, inputs] of cases) {
      expect(expectParity(schema, inputs).type).toBe("fallback");
    }
  });

  it("keeps regex flags", () => {
    expectParity(z.string().regex(/abc/i), ["ABC", "abd"]);
    expectParity(z.emoji(), ["😀", "a"]);
  });

  it("stateful regex flags fall back", () => {
    const ir = expectParity(z.string().regex(/a/g), ["a", "a", "b"]);
    expect(ir.type).toBe("fallback");
  });

  it("uses a custom email pattern", () => {
    expectParity(z.email({ pattern: /^a@b$/ }), ["a@b", "x@y.com"]);
  });
});

describe("checks on types without check codegen fall back", () => {
  const n = 1;
  const cases: [string, z.ZodType, unknown[]][] = [
    ["array refine (capturing)", z.array(z.number()).refine((a) => a.length > n), [[1], [1, 2]]],
    ["date refine", z.date().refine((d) => d.getTime() > 0), [new Date(0), new Date(1)]],
    ["set refine", z.set(z.number()).refine((s) => s.size > 1), [new Set([1])]],
    ["set size", z.set(z.number()).size(2), [new Set([1]), new Set([1, 2])]],
    ["bigint refine", z.bigint().refine((b) => b > 1n), [1n, 2n]],
    ["int64", z.int64(), [2n ** 70n, 1n]],
    ["map refine", z.map(z.string(), z.number()).refine((m) => m.size > 1), [new Map([["a", 1]])]],
    ["boolean refine", z.boolean().refine((b) => b), [false, true]],
    [
      "optional refine",
      z
        .string()
        .optional()
        .refine((s) => s !== "x"),
      ["x", "y", undefined],
    ],
    ["union refine", z.union([z.string(), z.number()]).refine((v) => v !== 1), [1, 2]],
  ];
  for (const [name, schema, inputs] of cases) {
    it(name, () => {
      expect(expectParity(schema, inputs).type).toBe("fallback");
    });
  }

  it("zero-capture array refine still compiles", () => {
    expect(
      expectParity(
        z.array(z.number()).refine((a) => a.length > 1),
        [[1], [1, 2]],
      ).type,
    ).toBe("array");
  });
});

describe("value rewrites inside containers that cannot write them back fall back", () => {
  const cases: [string, z.ZodType, unknown[]][] = [
    ["record key trim", z.record(z.string().trim(), z.number()), [{ " a ": 1 }]],
    ["record key lowercase", z.record(z.string().toLowerCase(), z.number()), [{ ABC: 1 }]],
    ["set element trim", z.set(z.string().trim()), [new Set([" a "])]],
    ["set element url", z.set(z.url()), [new Set([" https://a.com"])]],
    ["set element coerce", z.set(z.coerce.string()), [new Set([1])]],
    ["map key lowercase", z.map(z.string().toLowerCase(), z.number()), [new Map([["AB", 1]])]],
    ["map value trim", z.map(z.string(), z.string().trim()), [new Map([["a", " b "]])]],
  ];
  for (const [name, schema, inputs] of cases) {
    it(name, () => {
      expect(expectParity(schema, inputs).type).toBe("fallback");
    });
  }

  it("record values are still compiled", () => {
    expect(expectParity(z.record(z.string(), z.string().trim()), [{ a: " b " }]).type).toBe(
      "record",
    );
  });
});

describe("checks attached to the wrong type via .check() fall back", () => {
  const cases: [string, z.ZodType, unknown[]][] = [
    ["string + gte", z.string().check(z.gte(1)), ["a"]],
    ["string + int", z.string().check(z.int()), ["a"]],
    ["number + regex", z.number().check(z.regex(/1/)), [5, 1]],
    ["array + gt", z.array(z.number()).check(z.gt(5)), [[1]]],
    ["object + minLength", z.object({}).check(z.minLength(1)), [{}]],
  ];
  for (const [name, schema, inputs] of cases) {
    it(name, () => {
      expect(expectParity(schema, inputs).type).toBe("fallback");
    });
  }
});
