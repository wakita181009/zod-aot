import { describe, expect, it } from "vitest";
import { ZodRealError, z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import type { RefEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import { FIN_DECL } from "#src/core/iife.js";
import type { SafeParseResult, SchemaIR } from "#src/core/types.js";

// Regression tests for #281: numeric remainders, record input checks, and
// generated code that only breaks in strict mode (CLI output is an ES module).

const __fin = new Function("__ZodError", `${FIN_DECL}; return __fin;`)(ZodRealError);

function compileStrict(schema: z.ZodType): {
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
    `"use strict";\n${result.code}\nreturn ${result.functionDef};`,
  )(
    ZodRealError,
    __fin,
    refs.map((r) => r.schema),
  );
  return { ir, safeParse };
}

function expectParity(schema: z.ZodType, inputs: unknown[]): SchemaIR {
  const { ir, safeParse } = compileStrict(schema);
  for (const input of inputs) {
    const expected = schema.safeParse(input);
    const actual = safeParse(input);
    expect({ input, success: actual.success }).toEqual({ input, success: expected.success });
    if (expected.success && actual.success) {
      expect(actual.data).toEqual(expected.data);
    }
  }
  return ir;
}

describe("multipleOf", () => {
  it("compiles integer steps", () => {
    const ir = expectParity(z.number().multipleOf(5), [10, 11, -15, 0, 2.5]);
    expect(ir.type).toBe("number");
  });

  it("falls back for fractional steps", () => {
    const ir = expectParity(z.number().multipleOf(0.1), [0.3, 0.1 + 0.2, 0.35, 1]);
    expect(ir.type).toBe("fallback");
    expectParity(z.number().multipleOf(0.07), [2.03, 2.04]);
  });
});

describe("date checks in strict mode", () => {
  it("does not throw ReferenceError on the fast path", () => {
    const min = new Date("2020-01-01T00:00:00.000Z");
    const max = new Date("2030-01-01T00:00:00.000Z");
    expectParity(z.date().min(min), [new Date("2021-01-01"), new Date("2019-01-01")]);
    expectParity(z.date().min(min).max(max), [
      new Date("2021-01-01"),
      new Date("2031-01-01"),
      new Date(Number.NaN),
    ]);
    expectParity(z.object({ a: z.date().min(min), b: z.date().max(max) }), [
      { a: new Date("2021-01-01"), b: new Date("2021-01-01") },
    ]);
  });
});

describe("record input must be a plain object", () => {
  const schema = z.record(z.string(), z.number());
  class Foo {
    a = 1;
  }

  it("rejects non-plain objects like Zod", () => {
    expectParity(schema, [new Set([1]), new Map([["a", 1]]), new Date(0), new Foo(), [], null]);
  });

  it("accepts plain and null-prototype objects", () => {
    const nullProto = Object.assign(Object.create(null), { a: 1 });
    expectParity(schema, [{ a: 1 }, {}, nullProto]);
  });

  it("applies on the slow path too", () => {
    // A failing value forces the slow path for the plain object inputs.
    expectParity(z.record(z.string(), z.number().min(5)), [new Set([1]), { a: 1 }, { a: 6 }]);
  });
});
