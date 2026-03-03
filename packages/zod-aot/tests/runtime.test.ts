import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createFallback } from "#src/runtime.js";

// ─── Fallback (Dev-time) Behavior ───────────────────────────────────────────

describe("createFallback — wraps Zod schema as CompiledSchema", () => {
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

  it("is() returns true for valid input", () => {
    const compiled = createFallback(schema);
    expect(compiled.is({ name: "Alice", age: 30 })).toBe(true);
  });

  it("is() returns false for invalid input", () => {
    const compiled = createFallback(schema);
    expect(compiled.is({ name: "", age: -1 })).toBe(false);
    expect(compiled.is(null)).toBe(false);
    expect(compiled.is("string")).toBe(false);
  });

  it("preserves the original schema reference", () => {
    const compiled = createFallback(schema);
    expect(compiled.schema).toBe(schema);
  });
});

describe("createFallback — works with various schema types", () => {
  it("works with string schema", () => {
    const compiled = createFallback(z.string());
    expect(compiled.parse("hello")).toBe("hello");
    expect(() => compiled.parse(42)).toThrow();
  });

  it("works with number schema", () => {
    const compiled = createFallback(z.number());
    expect(compiled.parse(42)).toBe(42);
    expect(() => compiled.parse("42")).toThrow();
  });

  it("works with array schema", () => {
    const compiled = createFallback(z.array(z.string()));
    expect(compiled.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(() => compiled.parse([1, 2])).toThrow();
  });

  it("works with enum schema", () => {
    const compiled = createFallback(z.enum(["a", "b", "c"]));
    expect(compiled.parse("a")).toBe("a");
    expect(() => compiled.parse("d")).toThrow();
  });

  it("works with union schema", () => {
    const compiled = createFallback(z.union([z.string(), z.number()]));
    expect(compiled.parse("hello")).toBe("hello");
    expect(compiled.parse(42)).toBe(42);
    expect(() => compiled.parse(true)).toThrow();
  });

  it("works with optional schema", () => {
    const compiled = createFallback(z.string().optional());
    expect(compiled.parse("hello")).toBe("hello");
    expect(compiled.parse(undefined)).toBeUndefined();
    expect(() => compiled.parse(42)).toThrow();
  });

  it("works with nullable schema", () => {
    const compiled = createFallback(z.string().nullable());
    expect(compiled.parse("hello")).toBe("hello");
    expect(compiled.parse(null)).toBeNull();
    expect(() => compiled.parse(42)).toThrow();
  });

  it("works with transform schema (not AOT-compilable but works at runtime)", () => {
    const compiled = createFallback(z.string().transform((v) => v.toUpperCase()));
    expect(compiled.parse("hello")).toBe("HELLO");
  });

  it("works with refine schema (not AOT-compilable but works at runtime)", () => {
    const compiled = createFallback(
      z.string().refine((v) => v.startsWith("a"), { message: "Must start with a" }),
    );
    expect(compiled.parse("abc")).toBe("abc");
    expect(() => compiled.parse("xyz")).toThrow();
  });
});

describe("createFallback — error compatibility", () => {
  it("safeParse error has issues array", () => {
    const compiled = createFallback(z.string().min(5));
    const result = compiled.safeParse("ab");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Array.isArray(result.error.issues)).toBe(true);
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("safeParse error issues have required fields", () => {
    const compiled = createFallback(z.object({ name: z.string() }));
    const result = compiled.safeParse({ name: 42 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0]!;
      expect(issue).toHaveProperty("code");
      expect(issue).toHaveProperty("path");
      expect(issue).toHaveProperty("message");
    }
  });

  it("parse throws an error with issues", () => {
    const compiled = createFallback(z.number());
    try {
      compiled.parse("not a number");
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});
