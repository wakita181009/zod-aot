import { describe, expect, it } from "vitest";
import { z } from "zod";
import { compile, isCompiledSchema } from "../../src/compile.js";

describe("compile()", () => {
  it("returns a CompiledSchema with parse/safeParse/is/schema", () => {
    const schema = z.string();
    const compiled = compile(schema);

    expect(compiled.parse).toBeTypeOf("function");
    expect(compiled.safeParse).toBeTypeOf("function");
    expect(compiled.is).toBeTypeOf("function");
    expect(compiled.schema).toBe(schema);
  });

  it("parse() works as Zod fallback for valid input", () => {
    const schema = z.object({ name: z.string() });
    const compiled = compile(schema);

    const result = compiled.parse({ name: "Alice" });
    expect(result).toEqual({ name: "Alice" });
  });

  it("parse() throws for invalid input", () => {
    const schema = z.number();
    const compiled = compile(schema);

    expect(() => compiled.parse("not a number")).toThrow();
  });

  it("safeParse() returns success for valid input", () => {
    const schema = z.string().min(3);
    const compiled = compile(schema);

    const result = compiled.safeParse("hello");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("hello");
    }
  });

  it("safeParse() returns error for invalid input", () => {
    const schema = z.string().min(3);
    const compiled = compile(schema);

    const result = compiled.safeParse("ab");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("is() returns true for valid input", () => {
    const schema = z.number().int();
    const compiled = compile(schema);

    expect(compiled.is(42)).toBe(true);
  });

  it("is() returns false for invalid input", () => {
    const schema = z.number().int();
    const compiled = compile(schema);

    expect(compiled.is(3.14)).toBe(false);
    expect(compiled.is("hello")).toBe(false);
  });
});

describe("isCompiledSchema()", () => {
  it("returns true for compile() results", () => {
    const compiled = compile(z.string());
    expect(isCompiledSchema(compiled)).toBe(true);
  });

  it("returns false for plain objects", () => {
    expect(isCompiledSchema({})).toBe(false);
    const noop = () => undefined;
    expect(isCompiledSchema({ parse: noop, safeParse: noop, is: noop })).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isCompiledSchema(null)).toBe(false);
    expect(isCompiledSchema(undefined)).toBe(false);
    expect(isCompiledSchema(42)).toBe(false);
    expect(isCompiledSchema("string")).toBe(false);
  });
});
