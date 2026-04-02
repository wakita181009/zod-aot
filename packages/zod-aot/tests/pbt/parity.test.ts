/**
 * Property-Based Testing: Zod/AOT differential parity.
 *
 * Two test suites:
 *   1. fc.anything() — catches type-level divergences (Phase 1)
 *   2. IR-driven arbitraries — exercises type-aware boundaries (Phase 2)
 *
 * Both use Zod as oracle: zodSchema.safeParse(input) is ground truth.
 */

import fc from "fast-check";
import { describe, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import { generateArbitrary } from "./arbitraries/index.js";
import { assertParity, compileFromZod } from "./harness.js";

const NUM_RUNS = 100;

// ─── Test Matrix ──────────────────────────────────────────────────────────────

const testMatrix: Array<{
  name: string;
  zodSchema: z.ZodType;
}> = [
  // Primitives
  { name: "string", zodSchema: z.string() },
  { name: "string.min(3).max(20)", zodSchema: z.string().min(3).max(20) },
  { name: "string.email()", zodSchema: z.email() },
  { name: "number", zodSchema: z.number() },
  { name: "number.int().min(0).max(100)", zodSchema: z.number().int().min(0).max(100) },
  { name: "boolean", zodSchema: z.boolean() },
  { name: "bigint", zodSchema: z.bigint() },
  { name: "bigint.min(0n).max(100n)", zodSchema: z.bigint().min(0n).max(100n) },
  { name: "date", zodSchema: z.date() },
  { name: "symbol", zodSchema: z.symbol() },
  { name: "null", zodSchema: z.null() },
  { name: "undefined", zodSchema: z.undefined() },
  { name: "void", zodSchema: z.void() },
  { name: "nan", zodSchema: z.nan() },
  { name: "any", zodSchema: z.any() },
  { name: "unknown", zodSchema: z.unknown() },
  { name: "literal('hello')", zodSchema: z.literal("hello") },
  { name: "literal(42)", zodSchema: z.literal(42) },
  { name: "enum(['a','b','c'])", zodSchema: z.enum(["a", "b", "c"]) },

  // Containers
  {
    name: "object({name:string,age:int})",
    zodSchema: z.object({ name: z.string().min(1), age: z.number().int().min(0) }),
  },
  { name: "array(string).min(1).max(5)", zodSchema: z.array(z.string()).min(1).max(5) },
  {
    name: "tuple([string,number,boolean])",
    zodSchema: z.tuple([z.string(), z.number(), z.boolean()]),
  },
  { name: "record(string,number)", zodSchema: z.record(z.string(), z.number()) },
  { name: "set(string)", zodSchema: z.set(z.string()) },
  { name: "map(string,number)", zodSchema: z.map(z.string(), z.number()) },

  // Unions
  { name: "union([string,number])", zodSchema: z.union([z.string(), z.number()]) },
  {
    name: "discriminatedUnion",
    zodSchema: z.discriminatedUnion("type", [
      z.object({ type: z.literal("a"), value: z.string() }),
      z.object({ type: z.literal("b"), count: z.number() }),
    ]),
  },

  // Modifiers
  { name: "optional(string)", zodSchema: z.string().optional() },
  { name: "nullable(string)", zodSchema: z.string().nullable() },
  { name: "default(string,'N/A')", zodSchema: z.string().default("N/A") },
  { name: "catch(string,'fb')", zodSchema: z.string().catch("fb") },
  { name: "readonly(object)", zodSchema: z.object({ x: z.number() }).readonly() },

  // Coerce
  { name: "coerce.string()", zodSchema: z.coerce.string() },
  { name: "coerce.number()", zodSchema: z.coerce.number() },
  { name: "coerce.boolean()", zodSchema: z.coerce.boolean() },

  // Nested
  {
    name: "array(object({id:number,tags:array(string)}))",
    zodSchema: z.array(z.object({ id: z.number().int(), tags: z.array(z.string()) })),
  },
];

// ─── Phase 1: fc.anything() ───────────────────────────────────────────────────

describe("PBT Phase 1: fc.anything() parity", () => {
  for (const { name, zodSchema } of testMatrix) {
    it(`anything: ${name}`, () => {
      const safeParse = compileFromZod(zodSchema, name.replace(/[^a-zA-Z0-9]/g, "_"));

      fc.assert(
        fc.property(fc.anything(), (input) => {
          assertParity(zodSchema, safeParse, input);
        }),
        { numRuns: NUM_RUNS },
      );
    });
  }
});

// ─── Phase 2: IR-driven arbitraries ───────────────────────────────────────────

describe("PBT Phase 2: IR-driven parity", () => {
  for (const { name, zodSchema } of testMatrix) {
    it(`ir-driven: ${name}`, () => {
      const safeParse = compileFromZod(zodSchema, name.replace(/[^a-zA-Z0-9]/g, "_"));
      const ir = extractSchema(zodSchema);
      const arb = generateArbitrary(ir);

      fc.assert(
        fc.property(arb, (input) => {
          assertParity(zodSchema, safeParse, input);
        }),
        { numRuns: NUM_RUNS },
      );
    });
  }
});
