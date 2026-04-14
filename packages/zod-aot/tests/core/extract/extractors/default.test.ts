import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { FallbackEntry } from "#src/core/extract/types.js";
import type { DefaultIR, FallbackIR } from "#src/core/types.js";

describe("extractSchema — default (no fallback tracking)", () => {
  it("extracts string with static default", () => {
    const ir = extractSchema(z.string().default("hello")) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.inner.type).toBe("string");
    expect(ir.defaultValue).toBe("hello");
  });

  it("extracts number with static default", () => {
    const ir = extractSchema(z.number().default(42)) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.inner.type).toBe("number");
    expect(ir.defaultValue).toBe(42);
  });

  it("extracts object with static default", () => {
    const ir = extractSchema(z.object({ a: z.string() }).default({ a: "hi" })) as DefaultIR;
    expect(ir.type).toBe("default");
    expect(ir.inner.type).toBe("object");
    expect(ir.defaultValue).toEqual({ a: "hi" });
  });

  // M5: Date default values should fall back to Zod
  it("falls back for Date default value", () => {
    const ir = extractSchema(z.date().default(new Date("2024-01-01")));
    expect(ir.type).toBe("fallback");
    expect((ir as FallbackIR).reason).toBe("unsupported");
  });

  it("falls back for non-JSON-serializable default (circular ref)", () => {
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    const ir = extractSchema(z.string().default(circular as unknown as string));
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
    expect(ir.defaultValue).toBeUndefined();
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
