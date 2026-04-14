import { describe, expect, it } from "vitest";
import { ZodRealError, z } from "zod";
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

  it("factory default produces correct runtime values via __fb[]", () => {
    let counter = 0;
    const schema = z.object({ id: z.number() }).default(() => ({ id: counter++ }));
    const results = compileSchemas([{ exportName: "factoryDefault", schema }]);
    const info = results[0];
    expect(info).toBeDefined();

    const fbArr = info?.fallbackEntries.map(() => schema) ?? [];
    const fn = new Function(
      "__ZodError",
      "__fb",
      `${info?.codegenResult.code}\nreturn ${info?.codegenResult.functionDef};`,
    )(ZodRealError, fbArr);

    // Each call with undefined should invoke the factory, producing different values
    const r1 = fn(undefined);
    const r2 = fn(undefined);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r1.data.id).not.toBe(r2.data.id);
  });

  it("factory Date default works at runtime via __fb[]", () => {
    const schema = z.date().default(() => new Date());
    const results = compileSchemas([{ exportName: "dateFactory", schema }]);
    const info = results[0];
    expect(info).toBeDefined();

    const fbArr = info?.fallbackEntries.map(() => schema) ?? [];
    const fn = new Function(
      "__ZodError",
      "__fb",
      `${info?.codegenResult.code}\nreturn ${info?.codegenResult.functionDef};`,
    )(ZodRealError, fbArr);

    const r1 = fn(undefined);
    expect(r1.success).toBe(true);
    expect(r1.data).toBeInstanceOf(Date);

    // Valid Date input should also work
    const d = new Date("2024-01-01");
    const r2 = fn(d);
    expect(r2.success).toBe(true);
    expect(r2.data).toEqual(d);
  });

  it("static default still works via __fb[] runtime reference", () => {
    const schema = z.string().default("hello");
    const results = compileSchemas([{ exportName: "staticDefault", schema }]);
    const info = results[0];
    expect(info).toBeDefined();

    const fbArr = info?.fallbackEntries.map(() => schema) ?? [];
    const fn = new Function(
      "__ZodError",
      "__fb",
      `${info?.codegenResult.code}\nreturn ${info?.codegenResult.functionDef};`,
    )(ZodRealError, fbArr);

    expect(fn(undefined)).toEqual({ success: true, data: "hello" });
    expect(fn("world")).toEqual({ success: true, data: "world" });
    expect(fn(42).success).toBe(false);
  });

  it("factory UUID default produces unique values each time", () => {
    const schema = z.uuid().default(() => crypto.randomUUID());
    const results = compileSchemas([{ exportName: "uuidFactory", schema }]);
    const info = results[0];
    expect(info).toBeDefined();

    const fbArr = info?.fallbackEntries.map(() => schema) ?? [];
    const fn = new Function(
      "__ZodError",
      "__fb",
      `${info?.codegenResult.code}\nreturn ${info?.codegenResult.functionDef};`,
    )(ZodRealError, fbArr);

    // undefined → factory generates unique UUID each time
    const r1 = fn(undefined);
    const r2 = fn(undefined);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r1.data).toMatch(/^[0-9a-f]{8}-/);
    expect(r2.data).toMatch(/^[0-9a-f]{8}-/);
    expect(r1.data).not.toBe(r2.data);

    // Valid UUID input → fast path returns as-is
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(fn(validUuid)).toEqual({ success: true, data: validUuid });

    // Invalid string → fails validation
    expect(fn("not-a-uuid").success).toBe(false);

    // undefined → result matches Zod behavior
    const zodResult = schema.safeParse(undefined);
    expect(zodResult.success).toBe(true);
  });

  it("factory timestamp default produces different values each call", () => {
    // performance.now() has microsecond precision — no need for setTimeout
    const schema = z.number().default(() => performance.now());
    const results = compileSchemas([{ exportName: "tsFactory", schema }]);
    const info = results[0];
    expect(info).toBeDefined();

    const fbArr = info?.fallbackEntries.map(() => schema) ?? [];
    const fn = new Function(
      "__ZodError",
      "__fb",
      `${info?.codegenResult.code}\nreturn ${info?.codegenResult.functionDef};`,
    )(ZodRealError, fbArr);

    const r1 = fn(undefined);
    const r2 = fn(undefined);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(typeof r1.data).toBe("number");
    expect(typeof r2.data).toBe("number");
    expect(r2.data).not.toBe(r1.data);

    // Explicit number input bypasses default
    expect(fn(42)).toEqual({ success: true, data: 42 });
  });
});
