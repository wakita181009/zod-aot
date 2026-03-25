import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { FallbackEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { FallbackIR, PipeIR, StringIR } from "#src/core/types.js";

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
    const ir = extractSchema(schema) as PipeIR;
    expect(ir.type).toBe("pipe");
    expect(ir.in.type).toBe("string");
    expect(ir.out.type).toBe("string");
    expect((ir.in as StringIR).checks).toContainEqual({ kind: "min_length", minimum: 1 });
    expect((ir.out as StringIR).checks).toContainEqual({ kind: "max_length", maximum: 50 });
  });

  it("partially falls back when pipe output contains a transform", () => {
    const schema = z.string().pipe(z.string().transform((v) => v.toUpperCase()));
    const ir = extractSchema(schema) as PipeIR;
    // Outer pipe is still extracted; only the inner transform part falls back
    expect(ir.type).toBe("pipe");
    expect(ir.in.type).toBe("string");
    expect(ir.out.type).toBe("fallback");
    expect((ir.out as FallbackIR).reason).toBe("transform");
  });

  it("does not produce fallback entries for non-transform pipe", () => {
    const fallbacks: FallbackEntry[] = [];
    const schema = z.string().pipe(z.string().min(3));
    extractSchema(schema, fallbacks);
    expect(fallbacks).toHaveLength(0);
  });

  it("produces fallback entry for transform inside pipe", () => {
    const fallbacks: FallbackEntry[] = [];
    const schema = z.string().pipe(z.string().transform((v) => v.toUpperCase()));
    extractSchema(schema, fallbacks);
    expect(fallbacks).toHaveLength(1);
  });
});
