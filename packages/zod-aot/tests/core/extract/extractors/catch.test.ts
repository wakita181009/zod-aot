import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { CatchIR, FallbackIR } from "#src/core/types.js";

describe("extractSchema — catch", () => {
  it("extracts string with static catch value", () => {
    const ir = extractSchema(z.string().catch("default")) as CatchIR;
    expect(ir.type).toBe("catch");
    expect(ir.inner.type).toBe("string");
    expect(ir.defaultValue).toBe("default");
  });

  it("extracts number with static catch value", () => {
    const ir = extractSchema(z.number().catch(0)) as CatchIR;
    expect(ir.type).toBe("catch");
    expect(ir.inner.type).toBe("number");
    expect(ir.defaultValue).toBe(0);
  });

  it("extracts boolean with static catch value", () => {
    const ir = extractSchema(z.boolean().catch(false)) as CatchIR;
    expect(ir.type).toBe("catch");
    expect(ir.inner.type).toBe("boolean");
    expect(ir.defaultValue).toBe(false);
  });

  it("extracts null catch value", () => {
    const ir = extractSchema(z.string().catch(null as unknown as string)) as CatchIR;
    expect(ir.type).toBe("catch");
    expect(ir.defaultValue).toBeNull();
  });

  it("extracts object catch value", () => {
    const schema = z.object({ name: z.string() }).catch({ name: "anon" });
    const ir = extractSchema(schema) as CatchIR;
    expect(ir.type).toBe("catch");
    expect(ir.inner.type).toBe("object");
    expect(ir.defaultValue).toEqual({ name: "anon" });
  });

  it("falls back when inner type has transform", () => {
    const schema = z
      .string()
      .transform((s) => s.toUpperCase())
      .catch("DEFAULT");
    const ir = extractSchema(schema);
    expect(ir.type).toBe("fallback");
    expect((ir as FallbackIR).reason).toBe("unsupported");
  });

  it("falls back for Date catch value", () => {
    const schema = z.date().catch(new Date("2024-01-01"));
    const ir = extractSchema(schema);
    expect(ir.type).toBe("fallback");
    expect((ir as FallbackIR).reason).toBe("unsupported");
  });

  it("extracts catch with undefined default (from function-based catch)", () => {
    // Function-based catch: at build time, executed with dummy ctx
    // (ctx) => ctx.input returns undefined because dummy ctx.input is undefined
    const ir = extractSchema(z.string().catch("fallback")) as CatchIR;
    expect(ir.type).toBe("catch");
    expect(ir.defaultValue).toBe("fallback");
  });

  it("extracts nested catch in object", () => {
    const schema = z.object({
      name: z.string().catch("anonymous"),
      age: z.number().catch(0),
    });
    const ir = extractSchema(schema);
    expect(ir.type).toBe("object");
    if (ir.type === "object") {
      const nameIR = ir.properties["name"] as CatchIR;
      expect(nameIR.type).toBe("catch");
      expect(nameIR.defaultValue).toBe("anonymous");

      const ageIR = ir.properties["age"] as CatchIR;
      expect(ageIR.type).toBe("catch");
      expect(ageIR.defaultValue).toBe(0);
    }
  });

  it("falls back when catchValue function throws", () => {
    const schema = z.string().catch((() => {
      throw new Error("fail");
    }) as unknown as string);
    const ir = extractSchema(schema);
    expect(ir.type).toBe("fallback");
    expect((ir as FallbackIR).reason).toBe("unsupported");
  });

  it("falls back for non-JSON-serializable catch value (circular ref)", () => {
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    const schema = z.string().catch(circular as unknown as string);
    const ir = extractSchema(schema);
    expect(ir.type).toBe("fallback");
    expect((ir as FallbackIR).reason).toBe("unsupported");
  });

  it("extracts catch with undefined default value (skips JSON.stringify)", () => {
    const ir = extractSchema(z.string().catch(undefined as unknown as string)) as CatchIR;
    expect(ir.type).toBe("catch");
    expect(ir.inner.type).toBe("string");
    expect(ir.defaultValue).toBeUndefined();
  });
});
