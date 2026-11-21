import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { RefEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { FallbackIR, PipeIR, StringIR, TransformEffectIR } from "#src/core/types.js";

describe("extractSchema — pipe", () => {
  it("extracts string-to-string pipe with checks", () => {
    const schema = z.string().pipe(z.string().min(3));
    const ir = extractSchema(schema) as PipeIR;
    expect(ir.type).toBe("pipe");
    expect(ir.in.type).toBe("string");
    expect(ir.out.type).toBe("string");
    expect((ir.out as StringIR).checks).toContainEqual({ kind: "min_length", minimum: 3 });
  });

  it("extracts number-to-number pipe with range checks", () => {
    const schema = z.number().pipe(z.number().min(0).max(100));
    const ir = extractSchema(schema) as PipeIR;
    expect(ir.type).toBe("pipe");
    expect(ir.in.type).toBe("number");
    expect(ir.out.type).toBe("number");
  });

  it("extracts pipe with checked input schema", () => {
    const schema = z.string().min(1).pipe(z.string().max(50));
    // Zod 4.0 falls back for a checked input (see "stop rules" below).
    (schema._zod as { version?: unknown }).version = { major: 4, minor: 6, patch: 0 };
    const ir = extractSchema(schema) as PipeIR;
    expect(ir.type).toBe("pipe");
    expect(ir.in.type).toBe("string");
    expect(ir.out.type).toBe("string");
    expect((ir.in as StringIR).checks).toContainEqual({ kind: "min_length", minimum: 1 });
    expect((ir.out as StringIR).checks).toContainEqual({ kind: "max_length", maximum: 50 });
  });

  it("compiles zero-capture transform in pipe output as EffectIR", () => {
    const schema = z.string().pipe(z.string().transform((v) => v.toUpperCase()));
    // Outer pipe wraps inner transform (which becomes EffectIR)
    const ir = extractSchema(schema) as PipeIR;
    expect(ir.type).toBe("pipe");
    expect(ir.in.type).toBe("string");
    const effectIR = ir.out as TransformEffectIR;
    expect(effectIR.type).toBe("effect");
    expect(effectIR.effectKind).toBe("transform");
    expect(effectIR.source).toContain("toUpperCase");
  });

  it("falls back when pipe output has captured-variable transform", () => {
    const suffix = "_suffix";
    const schema = z.string().pipe(z.string().transform((v) => v + suffix));
    // Outer pipe wraps inner transform (which falls back due to capture)
    const ir = extractSchema(schema) as PipeIR;
    expect(ir.type).toBe("pipe");
    expect(ir.out.type).toBe("fallback");
    expect((ir.out as FallbackIR).reason).toBe("transform");
  });

  it("does not produce fallback entries for non-transform pipe", () => {
    const refs: RefEntry[] = [];
    const schema = z.string().pipe(z.string().min(3));
    extractSchema(schema, refs);
    expect(refs).toHaveLength(0);
  });

  it("does not produce fallback entries for zero-capture transform in pipe", () => {
    const refs: RefEntry[] = [];
    const schema = z.string().pipe(z.string().transform((v) => v.toUpperCase()));
    extractSchema(schema, refs);
    expect(refs).toHaveLength(0);
  });

  it("produces fallback entry for captured-variable transform in pipe", () => {
    const refs: RefEntry[] = [];
    const suffix = "_suffix";
    const schema = z.string().pipe(z.string().transform((v) => v + suffix));
    extractSchema(schema, refs);
    expect(refs).toHaveLength(1);
  });
});

describe("extractPipe — stop rules", () => {
  // The rules follow the schema instance's version, so overriding it drives
  // every branch regardless of the installed Zod.
  function withVersion(schema: z.ZodType, minor: number) {
    (schema._zod as { version?: unknown }).version = { major: 4, minor, patch: 0 };
    return extractSchema(schema, []);
  }

  it("falls back on Zod 4.0 when the input may report a continuable issue", () => {
    expect(withVersion(z.string().min(1).pipe(z.string()), 0).type).toBe("fallback");
    expect(withVersion(z.object({ a: z.string().min(1) }).pipe(z.object({})), 0).type).toBe(
      "fallback",
    );
    const custom = z.custom<string>((v) => typeof v === "string").pipe(z.string());
    expect(withVersion(custom, 0).type).toBe("fallback");
  });

  it("compiles on Zod 4.0 when every input issue aborts", () => {
    expect(withVersion(z.string().pipe(z.string().min(1)), 0).type).toBe("pipe");
  });

  it("compiles a checked input from Zod 4.1", () => {
    expect(withVersion(z.string().min(1).pipe(z.string()), 1).type).toBe("pipe");
  });

  it("passes unrecognized keys from a strict input on Zod >= 4.5", () => {
    const strict = () => z.strictObject({ a: z.string() }).pipe(z.object({ a: z.string() }));
    expect((withVersion(strict(), 5) as PipeIR).passesUnrecognizedKeys).toBe(true);
    expect((withVersion(strict(), 4) as PipeIR).passesUnrecognizedKeys).toBeUndefined();
    const nested = z.array(z.strictObject({ a: z.string() })).pipe(z.array(z.unknown()));
    expect((withVersion(nested, 6) as PipeIR).passesUnrecognizedKeys).toBe(true);
    const fallbackIn = z.custom<string>((v) => typeof v === "string").pipe(z.string());
    expect((withVersion(fallbackIn, 6) as PipeIR).passesUnrecognizedKeys).toBe(true);
  });

  it("omits the flag when the input cannot report unrecognized keys", () => {
    const loose = z.object({ a: z.string() }).pipe(z.object({ a: z.string() }));
    expect((withVersion(loose, 6) as PipeIR).passesUnrecognizedKeys).toBeUndefined();
  });
});
