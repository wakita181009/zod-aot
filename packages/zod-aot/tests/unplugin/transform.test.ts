import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import type { FallbackEntry } from "#src/core/extractor.js";
import { extractSchema } from "#src/core/extractor.js";
import {
  removeCompileImport,
  rewriteSource,
  shouldTransform,
  transformCode,
} from "#src/unplugin/transform.js";

const fixturesDir = path.resolve(import.meta.dirname, "../fixtures");

describe("shouldTransform()", () => {
  it("includes .ts files", () => {
    expect(shouldTransform("/src/schemas.ts")).toBe(true);
  });

  it("includes .tsx files", () => {
    expect(shouldTransform("/src/component.tsx")).toBe(true);
  });

  it("includes .mts files", () => {
    expect(shouldTransform("/src/schemas.mts")).toBe(true);
  });

  it("includes .js files", () => {
    expect(shouldTransform("/src/schemas.js")).toBe(true);
  });

  it("excludes node_modules", () => {
    expect(shouldTransform("/node_modules/zod/index.ts")).toBe(false);
  });

  it("excludes .d.ts files", () => {
    expect(shouldTransform("/src/types.d.ts")).toBe(false);
  });

  it("excludes .compiled.ts files", () => {
    expect(shouldTransform("/src/schemas.compiled.ts")).toBe(false);
  });

  it("excludes .compiled.js files", () => {
    expect(shouldTransform("/src/schemas.compiled.js")).toBe(false);
  });

  it("excludes non-script files", () => {
    expect(shouldTransform("/src/styles.css")).toBe(false);
    expect(shouldTransform("/src/data.json")).toBe(false);
  });

  it("respects exclude option", () => {
    expect(shouldTransform("/src/generated/schemas.ts", { exclude: ["generated"] })).toBe(false);
  });

  it("respects include option", () => {
    expect(shouldTransform("/src/other.ts", { include: ["schemas"] })).toBe(false);
    expect(shouldTransform("/src/schemas.ts", { include: ["schemas"] })).toBe(true);
  });
});

describe("removeCompileImport()", () => {
  it("removes sole compile import", () => {
    const code = `import { compile } from "zod-aot";`;
    expect(removeCompileImport(code)).toBe("");
  });

  it("removes compile from mixed imports", () => {
    const code = `import { compile, createFallback } from "zod-aot";`;
    expect(removeCompileImport(code)).toBe(`import { createFallback } from "zod-aot";`);
  });

  it("preserves type imports on separate lines", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `import type { CompiledSchema } from "zod-aot";`,
    ].join("\n");
    const result = removeCompileImport(code);
    expect(result).not.toContain("compile");
    expect(result).toContain("CompiledSchema");
  });

  it("handles single quotes", () => {
    const code = `import { compile } from 'zod-aot';`;
    expect(removeCompileImport(code)).toBe("");
  });

  it("does not affect other module imports", () => {
    const code = `import { z } from "zod";`;
    expect(removeCompileImport(code)).toBe(code);
  });
});

describe("rewriteSource()", () => {
  const simpleSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  function makeCompiledInfo(exportName: string, schema: z.ZodType) {
    const ir = extractSchema(schema);
    const codegenResult = generateValidator(ir, exportName);
    return { exportName, codegenResult, fallbackEntries: [] };
  }

  it("replaces a single compile() call with IIFE", () => {
    const code = [
      `import { z } from "zod";`,
      `import { compile } from "zod-aot";`,
      `const UserSchema = z.object({ name: z.string() });`,
      `export const validateUser = compile(UserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("/* @__PURE__ */");
    expect(result).toContain("(() => {");
    expect(result).toContain("safeParse_validateUser");
    expect(result).toContain("schema:UserSchema,");
    expect(result).not.toContain("compile(UserSchema)");
    // compile import should be removed
    expect(result).not.toContain(`import { compile } from "zod-aot"`);
  });

  it("replaces multiple compile() calls", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(UserSchema);`,
      `export const validateProduct = compile(ProductSchema);`,
    ].join("\n");

    const productSchema = z.object({ id: z.number(), title: z.string() });
    const schemas = [
      makeCompiledInfo("validateUser", simpleSchema),
      makeCompiledInfo("validateProduct", productSchema),
    ];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("safeParse_validateUser");
    expect(result).toContain("safeParse_validateProduct");
    expect(result).not.toContain("compile(UserSchema)");
    expect(result).not.toContain("compile(ProductSchema)");
  });

  it("handles generic type parameter: compile<Type>(Schema)", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile<User>(UserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("safeParse_validateUser");
    expect(result).not.toContain("compile<User>(UserSchema)");
  });

  it("handles nested generic: compile<z.infer<typeof Schema>>(Schema)", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile<z.infer<typeof UserSchema>>(UserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("safeParse_validateUser");
    expect(result).not.toContain("compile<z.infer");
  });

  it("preserves schema variable reference in generated code", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(MyUserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("schema:MyUserSchema,");
  });

  it("handles inline schema expressions with nested parentheses", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(z.object({ name: z.string() }));`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("safeParse_validateUser");
    expect(result).not.toContain("compile(z.object");
    // The schema arg should capture the full expression
    expect(result).toContain("schema:z.object({ name: z.string() }),");
  });

  it("does not match export name as substring (word boundary)", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const revalidateUser = compile(OtherSchema);`,
      `export const validateUser = compile(UserSchema);`,
    ].join("\n");

    // Only "validateUser" is in the schemas list
    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    // "validateUser" should be replaced
    expect(result).toContain("safeParse_validateUser");
    // "revalidateUser" should NOT be replaced (still has compile())
    expect(result).toContain("revalidateUser = compile(OtherSchema)");
  });
});

describe("transformCode() E2E", () => {
  /**
   * Fixture files use relative imports (../../../src/index.js) for discoverSchemas to work,
   * but transformCode checks for "zod-aot" in the source. We pass the code with "zod-aot"
   * import so the quick check passes, while discoverSchemas loads the actual fixture file.
   */
  function readFixtureAsUserCode(fixturePath: string): string {
    const fs = require("node:fs") as typeof import("node:fs");
    return fs
      .readFileSync(fixturePath, "utf-8")
      .replace(/from\s*["'](?:\.\.\/.*?|#src\/.*?)["']/g, 'from "zod-aot"');
  }

  it("transforms a simple compile() file and produces working validation", async () => {
    const fixturePath = path.join(fixturesDir, "simple-schema.ts");
    const code = readFixtureAsUserCode(fixturePath);

    const result = await transformCode(code, fixturePath);

    expect(result).not.toBeNull();
    expect(result).toContain("safeParse_validateUser");
    expect(result).toContain("/* @__PURE__ */");
    expect(result).not.toContain("compile(UserSchema)");
  });

  it("transforms multiple compile() calls in one file", async () => {
    const fixturePath = path.join(fixturesDir, "multi-schema.ts");
    const code = readFixtureAsUserCode(fixturePath);

    const result = await transformCode(code, fixturePath);

    expect(result).not.toBeNull();
    expect(result).toContain("safeParse_validateUser");
    expect(result).toContain("safeParse_validateProduct");
  });

  it("returns null for files without compile()", async () => {
    const fixturePath = path.join(fixturesDir, "no-compile.ts");
    const code = readFixtureAsUserCode(fixturePath);

    const result = await transformCode(code, fixturePath);

    expect(result).toBeNull();
  });

  it("returns null when code does not reference zod-aot", async () => {
    const code = `export const x = 1;`;
    const result = await transformCode(code, "/fake/path.ts");

    expect(result).toBeNull();
  });
});

describe("generated IIFE runtime execution", () => {
  const userSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  function makeCompiledInfo(exportName: string, schema: z.ZodType) {
    const ir = extractSchema(schema);
    const codegenResult = generateValidator(ir, exportName);
    return { exportName, codegenResult, fallbackEntries: [] };
  }

  function executeGeneratedValidator(schemas: Parameters<typeof rewriteSource>[1]) {
    // Build source where compile() is a placeholder
    const code = [
      `import { compile } from "zod-aot";`,
      ...schemas.map((s) => `export const ${s.exportName} = compile(Schema);`),
    ].join("\n");

    const transformed = rewriteSource(code, schemas);

    // Extract the IIFE and execute it
    const iifeMatch = /\/\* @__PURE__ \*\/ \(\(\) => \{[\s\S]*?\}\)\(\)/.exec(transformed);
    expect(iifeMatch).not.toBeNull();

    // Execute the IIFE using Function constructor.
    // The IIFE references `Schema` (the original schema variable) in its `schema:` property,
    // so we inject a dummy value for it.
    const fn = new Function("Schema", `return ${iifeMatch?.[0]};`);
    return fn({}) as {
      parse: (input: unknown) => unknown;
      safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: unknown };
      is: (input: unknown) => boolean;
    };
  }

  it("generated safeParse returns success for valid input", () => {
    const schemas = [makeCompiledInfo("validateUser", userSchema)];
    const validator = executeGeneratedValidator(schemas);
    const result = validator.safeParse({ name: "Alice", age: 30 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "Alice", age: 30 });
  });

  it("generated safeParse returns failure for invalid input", () => {
    const schemas = [makeCompiledInfo("validateUser", userSchema)];
    const validator = executeGeneratedValidator(schemas);
    const result = validator.safeParse({ name: "", age: -5 });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("generated is() returns correct boolean", () => {
    const schemas = [makeCompiledInfo("validateUser", userSchema)];
    const validator = executeGeneratedValidator(schemas);

    expect(validator.is({ name: "Alice", age: 30 })).toBe(true);
    expect(validator.is({ name: 123 })).toBe(false);
  });

  it("generated parse throws on invalid input", () => {
    const schemas = [makeCompiledInfo("validateUser", userSchema)];
    const validator = executeGeneratedValidator(schemas);

    expect(() => validator.parse({ name: 123 })).toThrow("Validation failed");
    expect(validator.parse({ name: "Alice", age: 30 })).toEqual({ name: "Alice", age: 30 });
  });

  it("generated validator matches Zod behavior", () => {
    const schemas = [makeCompiledInfo("validateUser", userSchema)];
    const validator = executeGeneratedValidator(schemas);

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
      const zodResult = userSchema.safeParse(input);
      const aotResult = validator.safeParse(input);
      expect(aotResult.success).toBe(zodResult.success);
    }
  });
});

describe("rewriteSource() — partial fallback", () => {
  it("IIFE includes __fb declaration when schema has fallbacks", () => {
    const schema = z.object({
      name: z.string(),
      slug: z.string().transform((v) => v.toLowerCase()),
    });
    const fallbackEntries: FallbackEntry[] = [];
    const ir = extractSchema(schema, fallbackEntries);
    const codegenResult = generateValidator(ir, "validateUser", {
      fallbackCount: fallbackEntries.length,
    });

    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(UserSchema);`,
    ].join("\n");

    const result = rewriteSource(code, [
      { exportName: "validateUser", codegenResult, fallbackEntries },
    ]);

    expect(result).toContain("var __fb=");
    expect(result).toContain('UserSchema.shape["slug"]');
    expect(result).toContain("__fb[0].safeParse");
  });

  it("IIFE has no __fb when schema has no fallbacks", () => {
    const schema = z.object({ name: z.string() });
    const ir = extractSchema(schema);
    const codegenResult = generateValidator(ir, "validateUser");

    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(UserSchema);`,
    ].join("\n");

    const result = rewriteSource(code, [
      { exportName: "validateUser", codegenResult, fallbackEntries: [] },
    ]);

    expect(result).not.toContain("__fb");
  });
});
