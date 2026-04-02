import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import type { FallbackEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import { generateIIFE } from "#src/core/iife.js";
import type { CompiledSchemaInfo } from "#src/core/pipeline.js";

function makeInfo(exportName: string, schema: z.ZodType): CompiledSchemaInfo {
  const ir = extractSchema(schema);
  const codegenResult = generateValidator(ir, exportName);
  return { exportName, codegenResult, fallbackEntries: [] };
}

function makeInfoWithFallback(exportName: string, schema: z.ZodType): CompiledSchemaInfo {
  const fallbackEntries: FallbackEntry[] = [];
  const ir = extractSchema(schema, fallbackEntries);
  const codegenResult = generateValidator(ir, exportName, {
    fallbackCount: fallbackEntries.length,
  });
  return { exportName, codegenResult, fallbackEntries };
}

describe("generateIIFE()", () => {
  const simpleSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it("includes preamble declarations", () => {
    const info = makeInfo("validateRole", z.enum(["admin", "user", "editor", "viewer"]));
    const iife = generateIIFE("RoleSchema", info);

    expect(iife).toContain('new Set(["admin","user","editor","viewer"])');
    expect(iife).toContain("/* @__PURE__ */");
  });

  it("includes parse() that throws on invalid input", () => {
    const info = makeInfo("validateNum", z.number());
    const iife = generateIIFE("NumSchema", info);

    expect(iife).toContain("throw Object.assign");
  });

  it("includes __fb when schema has fallbacks (captured-variable transform)", () => {
    // Use a captured variable to ensure fallback (zero-capture transforms are now compiled)
    const prefix = "prefix_";
    const schema = z.object({
      name: z.string(),
      slug: z.string().transform((v) => prefix + v),
    });
    const info = makeInfoWithFallback("validateUser", schema);
    const iife = generateIIFE("UserSchema", info);

    expect(iife).toContain("var __fb=");
    expect(iife).toContain('UserSchema.shape["slug"]');
  });

  it("has no __fb when schema has zero-capture transform (compiled as effect)", () => {
    const schema = z.object({
      name: z.string(),
      slug: z.string().transform((v) => v.toLowerCase()),
    });
    const info = makeInfoWithFallback("validateUser", schema);
    const iife = generateIIFE("UserSchema", info);

    // Zero-capture transforms are compiled, so no fallback needed
    expect(iife).not.toContain("__fb");
  });

  it("has no __fb when schema has no fallbacks", () => {
    const info = makeInfo("validateUser", z.object({ name: z.string() }));
    const iife = generateIIFE("UserSchema", info);

    expect(iife).not.toContain("__fb");
  });

  it("includes safeParseAsync and parseAsync", () => {
    const info = makeInfo("validateUser", simpleSchema);
    const iife = generateIIFE("UserSchema", info);

    expect(iife).toContain("__w.safeParseAsync=function");
    expect(iife).toContain("__w.parseAsync=function");
    expect(iife).toContain("Promise.resolve");
  });

  it("uses Object.create by default (zodCompat: true)", () => {
    const info = makeInfo("validateUser", simpleSchema);
    const iife = generateIIFE("UserSchema", info);

    expect(iife).toContain("Object.create(UserSchema)");
    expect(iife).toContain("__w.schema=UserSchema;");
  });

  describe("zodCompat: false", () => {
    it("produces plain object without Object.create", () => {
      const info = makeInfo("validateUser", simpleSchema);
      const iife = generateIIFE("UserSchema", info, { zodCompat: false });

      expect(iife).toContain("/* @__PURE__ */");
      expect(iife).not.toContain("Object.create");
      expect(iife).toContain("var __w={};");
      expect(iife).toContain("__w.schema=UserSchema;");
    });
  });
});

describe("generateIIFE() — error handling", () => {
  it("throws when functionDef is malformed", () => {
    const info: CompiledSchemaInfo = {
      exportName: "test",
      codegenResult: {
        code: "/* zod-aot */",
        functionDef: "const x = 1;",
        fallbackCount: 0,
      },
      fallbackEntries: [],
    };
    expect(() => generateIIFE("Schema", info)).toThrow(
      "Cannot extract function name from generated code",
    );
  });

  it("throws when functionDef is empty", () => {
    const info: CompiledSchemaInfo = {
      exportName: "test",
      codegenResult: {
        code: "/* zod-aot */",
        functionDef: "",
        fallbackCount: 0,
      },
      fallbackEntries: [],
    };
    expect(() => generateIIFE("Schema", info)).toThrow(
      "Cannot extract function name from generated code",
    );
  });
});

describe("generateIIFE() — runtime execution", () => {
  const simpleSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  function executeIIFE(schema: CompiledSchemaInfo, options?: { zodCompat?: boolean }) {
    const iife = generateIIFE("Schema", schema, options);
    const __msg = z.config().localeError;
    const fn = new Function("Schema", "__msg", `return ${iife};`);
    return fn({}, __msg) as {
      parse: (input: unknown) => unknown;
      safeParse: (input: unknown) => {
        success: boolean;
        data?: unknown;
        error?: { issues: unknown[] };
      };
      safeParseAsync: (
        input: unknown,
      ) => Promise<{ success: boolean; data?: unknown; error?: unknown }>;
      parseAsync: (input: unknown) => Promise<unknown>;
      is: (input: unknown) => boolean;
    };
  }

  it("safeParse returns success for valid input", () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema));
    const result = validator.safeParse({ name: "Alice", age: 30 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "Alice", age: 30 });
  });

  it("safeParse returns failure for invalid input", () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema));
    const result = validator.safeParse({ name: "", age: -5 });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("parse throws on invalid input", () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema));

    expect(() => validator.parse({ name: 123 })).toThrow("Validation failed");
    expect(validator.parse({ name: "Alice", age: 30 })).toEqual({ name: "Alice", age: 30 });
  });

  it("safeParseAsync returns Promise", async () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema));
    const result = await validator.safeParseAsync({ name: "Alice", age: 30 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "Alice", age: 30 });
  });

  it("parseAsync resolves for valid input", async () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema));
    const data = await validator.parseAsync({ name: "Alice", age: 30 });

    expect(data).toEqual({ name: "Alice", age: 30 });
  });

  it("parseAsync rejects for invalid input", async () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema));

    await expect(validator.parseAsync({ name: 123 })).rejects.toThrow("Validation failed");
  });

  it("produces error messages when __msg is provided", () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema));

    const result = validator.safeParse("not an object");
    expect(result.success).toBe(false);
    const issues = result.error?.issues as Record<string, unknown>[];
    expect(issues?.[0]).toHaveProperty("message");
    expect(typeof issues?.[0]?.["message"]).toBe("string");
  });

  it("matches Zod behavior", () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema));

    const inputs = [
      { name: "Alice", age: 30 },
      { name: "", age: 30 },
      { name: "Bob", age: -1 },
      { name: "Carol", age: 1.5 },
      { name: 123, age: 30 },
      "not an object",
      null,
    ];

    for (const input of inputs) {
      const zodResult = simpleSchema.safeParse(input);
      const aotResult = validator.safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });

  it("works with zodCompat: false", () => {
    const validator = executeIIFE(makeInfo("validateUser", simpleSchema), { zodCompat: false });

    expect(validator.safeParse({ name: "Alice", age: 30 }).success).toBe(true);
    expect(validator.safeParse({ name: "", age: -1 }).success).toBe(false);
  });
});
