import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { DefaultIR, FallbackIR } from "#src/core/types.js";

describe("extractSchema — default", () => {
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
});
