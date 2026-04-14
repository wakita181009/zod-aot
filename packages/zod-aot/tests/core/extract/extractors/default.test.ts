import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { FallbackEntry } from "#src/core/extract/types.js";
import type { DefaultIR, FallbackIR } from "#src/core/types.js";

describe("extractSchema — default (no fallback tracking)", () => {
  it("always falls back without fallback tracking", () => {
    const ir = extractSchema(z.string().default("hello"));
    expect(ir.type).toBe("fallback");
    expect((ir as FallbackIR).reason).toBe("unsupported");
  });
});

describe("extractSchema — default (with fallback tracking)", () => {
  it("uses runtime reference for static default", () => {
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(z.string().default("hello"), fallbacks) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.fallbackIndex).toBe(0);
    expect(fallbacks).toHaveLength(1);
  });

  it("uses runtime reference for factory default", () => {
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(
      z.string().default(() => "dynamic"),
      fallbacks,
    ) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.fallbackIndex).toBe(0);
    expect(fallbacks).toHaveLength(1);
  });

  it("uses runtime reference for Date factory default (not a fallback)", () => {
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(
      z.date().default(() => new Date()),
      fallbacks,
    ) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.fallbackIndex).toBe(0);
    expect(fallbacks).toHaveLength(1);
  });

  it("uses runtime reference for dynamic object factory default", () => {
    let counter = 0;
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(
      z.object({ id: z.number() }).default(() => ({ id: counter++ })),
      fallbacks,
    ) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.fallbackIndex).toBe(0);
    expect(fallbacks).toHaveLength(1);
  });

  it("assigns incrementing fallback indices", () => {
    const fallbacks: FallbackEntry[] = [];
    const schema = z.object({
      a: z.string().default("x"),
      b: z.number().default(() => Date.now()),
    });
    const ir = extractSchema(schema, fallbacks);
    expect(ir.type).toBe("object");
    expect(fallbacks.length).toBeGreaterThanOrEqual(2);
  });
});
