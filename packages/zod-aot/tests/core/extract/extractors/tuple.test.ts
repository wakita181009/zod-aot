import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { TupleIR } from "#src/core/types.js";

describe("extractTuple", () => {
  it("extracts tuple with fixed items", () => {
    const ir = extractSchema(z.tuple([z.string(), z.number()])) as TupleIR;
    expect(ir.type).toBe("tuple");
    expect(ir.items).toHaveLength(2);
    expect(ir.items[0]?.type).toBe("string");
    expect(ir.items[1]?.type).toBe("number");
    expect(ir.rest).toBeNull();
  });

  it("extracts tuple with rest element", () => {
    const ir = extractSchema(z.tuple([z.string()]).rest(z.number())) as TupleIR;
    expect(ir.items).toHaveLength(1);
    expect(ir.rest?.type).toBe("number");
  });
});

describe("extractTuple — absence rules", () => {
  // The rules follow the schema instance's version, so overriding it drives
  // every branch regardless of the installed Zod.
  function withVersion(schema: z.ZodType, major: number, minor: number, patch = 0) {
    (schema._zod as { version?: unknown }).version = { major, minor, patch };
    return (extractSchema(schema) as TupleIR).absence;
  }

  it("omits absence when every item is required (Zod >= 4.4)", () => {
    expect(withVersion(z.tuple([z.string(), z.number()]), 4, 6)).toBeUndefined();
  });

  it("computes optin/optout starts and per-item flags (Zod >= 4.5)", () => {
    // A pipe takes optin from its input and optout from its output, the same on every 4.x.
    const optionalIn = z.string().optional().pipe(z.string());
    const schema = z.tuple([z.number(), z.string().optional(), optionalIn]);
    expect(withVersion(schema, 4, 6)).toEqual({
      mode: "current",
      optinStart: 1,
      optoutStart: 3,
      skipAbsent: [false, true, true],
      trimUndefined: [false, true, false],
    });
  });

  it("never skips absent items on Zod 4.4", () => {
    const absence = withVersion(z.tuple([z.number(), z.string().optional()]), 4, 4);
    expect(absence).toMatchObject({ mode: "current", skipAbsent: [false, false] });
  });

  it("uses the legacy rules before 4.4", () => {
    const schema = () => z.tuple([z.number(), z.string().optional()]);
    expect(withVersion(schema(), 4, 3)).toEqual({
      mode: "legacy",
      optStart: 1,
      tooBigInclusive: true,
    });
    expect(withVersion(schema(), 4, 2)).toEqual({
      mode: "legacy",
      optStart: 1,
      tooBigInclusive: false,
    });
  });

  it("reproduces the pre-4.1.13 optStart for an all-optional tuple", () => {
    const schema = () => z.tuple([z.string().optional(), z.string().optional()]);
    expect(withVersion(schema(), 4, 0)).toMatchObject({ optStart: 3 });
    expect(withVersion(schema(), 4, 1, 12)).toMatchObject({ optStart: 3 });
    expect(withVersion(schema(), 4, 1, 13)).toMatchObject({ optStart: 0 });
  });

  it("omits absence when the schema carries no version", () => {
    const schema = z.tuple([z.string().optional()]);
    (schema._zod as { version?: unknown }).version = undefined;
    expect((extractSchema(schema) as TupleIR).absence).toBeUndefined();
  });
});
