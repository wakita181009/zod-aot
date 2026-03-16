import { describe, expect, it } from "vitest";
import { z } from "zod";
import { compile, isCompiledSchema } from "#src/core/compile.js";

describe("compile()", () => {
  it("returns a CompiledSchema with parse/safeParse/is/schema", () => {
    const schema = z.string();
    const compiled = compile(schema);

    expect(compiled.parse).toBeTypeOf("function");
    expect(compiled.safeParse).toBeTypeOf("function");
    expect(compiled.is).toBeTypeOf("function");
    expect(compiled.schema).toBe(schema);
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
