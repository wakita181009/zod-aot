import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFallback } from "#src/core/runtime.js";

describe("createFallback — wraps Zod schema as CompiledSchema via Object.create", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it("parse succeeds with valid input", () => {
    const compiled = createFallback(schema);
    const result = compiled.parse({ name: "Alice", age: 30 });
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("parse throws on invalid input", () => {
    const compiled = createFallback(schema);
    expect(() => compiled.parse({ name: "", age: -1 })).toThrow();
  });

  it("safeParse returns success for valid input", () => {
    const compiled = createFallback(schema);
    const result = compiled.safeParse({ name: "Alice", age: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
    }
  });

  it("safeParse returns error for invalid input", () => {
    const compiled = createFallback(schema);
    const result = compiled.safeParse({ name: "", age: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("preserves the original schema reference", () => {
    const compiled = createFallback(schema);
    expect(compiled.schema).toBe(schema);
  });
});

describe("createFallback — handles non-AOT-compilable schemas", () => {
  it("works with transform schema (falls back to Zod at runtime)", () => {
    const compiled = createFallback(z.string().transform((v) => v.toUpperCase()));
    expect(compiled.parse("hello")).toBe("HELLO");
  });

  it("works with refine schema (falls back to Zod at runtime)", () => {
    const compiled = createFallback(
      z.string().refine((v) => v.startsWith("a"), { message: "Must start with a" }),
    );
    expect(compiled.parse("abc")).toBe("abc");
    expect(() => compiled.parse("xyz")).toThrow();
  });
});

describe("createFallback — Zod compatibility via Object.create", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it("preserves _zod property via prototype", () => {
    const compiled = createFallback(schema);
    expect("_zod" in compiled).toBe(true);
  });

  it("safeParseAsync works via prototype", async () => {
    const compiled = createFallback(schema);
    const result = await compiled.safeParseAsync({ name: "Alice", age: 30 });
    expect(result).toHaveProperty("success", true);
  });

  it("instanceof checks pass", () => {
    const compiled = createFallback(schema);
    expect(compiled instanceof z.ZodObject).toBe(true);
  });
});
