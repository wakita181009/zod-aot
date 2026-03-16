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

  it("preserves Zod properties via Object.create prototype", () => {
    const schema = z.object({ name: z.string() });
    const compiled = compile(schema);

    expect("_zod" in compiled).toBe(true);
    expect((compiled as Record<string, unknown>).shape).toBe(schema.shape);
  });

  it("supports safeParseAsync via Zod prototype", async () => {
    const schema = z.object({ name: z.string() });
    const compiled = compile(schema);

    const result = await (
      compiled as Record<string, (...args: unknown[]) => unknown>
    ).safeParseAsync({ name: "Alice" });
    expect(result).toHaveProperty("success", true);
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
