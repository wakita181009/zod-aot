import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateValidator } from "../../src/codegen/index.js";
import { extractSchema } from "../../src/extractor/index.js";
import {
  removeCompileImport,
  rewriteSource,
  shouldTransform,
  transformCode,
} from "../../src/unplugin/transform.js";

const fixturesDir = path.resolve(import.meta.dirname, "fixtures");

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
    return { exportName, codegenResult };
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
      .replace(/from\s*["']\.\.\/.*?["']/g, 'from "zod-aot"');
  }

  it("transforms a simple compile() file and produces working validation", async () => {
    const fixturePath = path.join(fixturesDir, "basic-compile.ts");
    const code = readFixtureAsUserCode(fixturePath);

    const result = await transformCode(code, fixturePath);

    expect(result).not.toBeNull();
    expect(result).toContain("safeParse_validateUser");
    expect(result).toContain("/* @__PURE__ */");
    expect(result).not.toContain("compile(UserSchema)");
  });

  it("transforms multiple compile() calls in one file", async () => {
    const fixturePath = path.join(fixturesDir, "multi-compile.ts");
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
