import { describe, expect, it } from "vitest";
import { z } from "zod";
import { compileSchemas } from "#src/core/pipeline.js";

describe("compileSchemas", () => {
  it("returns CompiledSchemaInfo for each schema", () => {
    const schemas = [
      { exportName: "validateUser", schema: z.object({ name: z.string() }) },
      { exportName: "validatePost", schema: z.object({ title: z.string() }) },
    ];
    const results = compileSchemas(schemas);

    expect(results).toHaveLength(2);
    expect(results[0]?.exportName).toBe("validateUser");
    expect(results[1]?.exportName).toBe("validatePost");
    expect(results[0]?.codegenResult.functionDef).toContain("safeParse_validateUser");
    expect(results[1]?.codegenResult.functionDef).toContain("safeParse_validatePost");
  });

  it("collects fallbackEntries independently per schema", () => {
    // Use captured-variable transforms to ensure fallback (zero-capture transforms are now compiled)
    const external = "prefix_";
    const schemas = [
      {
        exportName: "withFallback",
        schema: z.object({
          name: z.string(),
          slug: z.string().transform((v) => external + v),
        }),
      },
      {
        exportName: "noFallback",
        schema: z.object({ name: z.string() }),
      },
    ];
    const results = compileSchemas(schemas);

    expect(results[0]?.fallbackEntries.length).toBeGreaterThan(0);
    expect(results[0]?.codegenResult.fallbackCount).toBe(results[0]?.fallbackEntries.length);
    expect(results[1]?.fallbackEntries).toHaveLength(0);
    expect(results[1]?.codegenResult.fallbackCount).toBe(0);
  });

  it("zero-capture transform/refine produce no fallback entries", () => {
    const schema = z.object({
      a: z.string().transform((v) => v),
      b: z.string(),
      c: z.number().refine((v) => v > 0),
    });
    const results = compileSchemas([{ exportName: "test", schema }]);

    // Zero-capture transform and refine are now compiled (no fallback)
    expect(results[0]?.fallbackEntries.length).toBe(0);
    expect(results[0]?.codegenResult.fallbackCount).toBe(0);
  });

  it("propagates fallbackCount to codegenResult for captured-variable transforms", () => {
    const external1 = "a";
    const external2 = "b";
    const schema = z.object({
      a: z.string().transform((v) => external1 + v),
      b: z.string(),
      c: z.number().transform((v) => v + Number(external2)),
    });
    const results = compileSchemas([{ exportName: "test", schema }]);

    expect(results[0]?.codegenResult.fallbackCount).toBe(results[0]?.fallbackEntries.length);
    // a (captured transform) + c (captured transform)
    expect(results[0]?.fallbackEntries.length).toBe(2);
  });

  it("continues on error when onError is provided", () => {
    const schemas = [
      { exportName: "badOne", schema: null },
      { exportName: "goodOne", schema: z.object({ name: z.string() }) },
    ];
    const errors: { name: string; error: Error }[] = [];
    const results = compileSchemas(schemas, {
      onError(name: string, error: Error) {
        errors.push({ name, error });
      },
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.name).toBe("badOne");
    expect(results).toHaveLength(1);
    expect(results[0]?.exportName).toBe("goodOne");
  });

  it("throws on error when onError is not provided", () => {
    const schemas = [{ exportName: "badOne", schema: null }];

    expect(() => compileSchemas(schemas)).toThrow();
  });

  it("generates valid code for each schema", () => {
    const schemas = [
      {
        exportName: "validateUser",
        schema: z.object({ name: z.string().min(1), age: z.number() }),
      },
    ];
    const results = compileSchemas(schemas);
    const code = results[0]?.codegenResult.code;
    const fnName = results[0]?.codegenResult.functionDef;

    expect(code).toBeDefined();
    expect(fnName).toBeDefined();

    // Verify generated code is syntactically valid
    expect(() => new Function(`${code}\nreturn ${fnName};`)).not.toThrow();
  });
});
