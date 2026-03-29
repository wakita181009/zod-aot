import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import {
  type BuildStats,
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

  it("includes .cjs and .cts files", () => {
    expect(shouldTransform("/src/schemas.cjs")).toBe(true);
    expect(shouldTransform("/src/schemas.cts")).toBe(true);
  });

  it("includes .jsx files", () => {
    expect(shouldTransform("/src/component.jsx")).toBe(true);
  });

  it("handles include and exclude together", () => {
    const options = { include: ["src/"], exclude: ["src/generated"] };
    expect(shouldTransform("/src/schemas.ts", options)).toBe(true);
    expect(shouldTransform("/src/generated/schemas.ts", options)).toBe(false);
    expect(shouldTransform("/lib/schemas.ts", options)).toBe(false);
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

  // H4: Should handle multi-line import statements
  it("removes compile from multi-line import", () => {
    const code = ["import {", "  compile,", "  createFallback", '} from "zod-aot";'].join("\n");
    const result = removeCompileImport(code);
    expect(result).not.toContain("compile");
    expect(result).toContain("createFallback");
  });

  it("removes sole compile from multi-line import", () => {
    const code = ["import {", "  compile", '} from "zod-aot";'].join("\n");
    const result = removeCompileImport(code);
    expect(result).toBe("");
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

  it("replaces a single compile() call with IIFE using Object.create", () => {
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
    expect(result).toContain("Object.create(UserSchema)");
    expect(result).toContain("__w.schema=UserSchema;");
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

  it("IIFE includes __msg from zod config import", () => {
    const code = [
      `import { z } from "zod";`,
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(UserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    // Should add zod config import
    expect(result).toContain('import { config as __zodAotConfig } from "zod"');
    // IIFE should declare __msg
    expect(result).toContain("var __msg=__zodAotConfig().localeError;");
  });

  it("preserves schema variable reference in generated code", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(MyUserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("__w.schema=MyUserSchema;");
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
    expect(result).toContain("__w.schema=z.object({ name: z.string() });");
  });

  it("handles inline schema with trailing comma", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(`,
      `  z.object({ name: z.string() }),`,
      `);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("safeParse_validateUser");
    expect(result).not.toContain("compile(");
    // Trailing comma should be stripped from the schema arg
    expect(result).toContain("__w.schema=z.object({ name: z.string() });");
    expect(result).not.toContain("z.object({ name: z.string() }),");
  });

  // C1 (from review): findMatchingParen should handle parens inside string literals
  it("handles parentheses inside string literal default values", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(z.object({ msg: z.string().default("balance: (100)") }));`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    expect(result).toContain("safeParse_validateUser");
    // The compile(...) call should be fully replaced
    expect(result).not.toContain("compile(z.object");
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

  it("returns null when code contains compile but not zod-aot", async () => {
    const code = `import { compile } from "other-lib";\nexport const x = compile(foo);`;
    const result = await transformCode(code, "/fake/path.ts");

    expect(result).toBeNull();
  });

  it("calls onBuildStats callback when schemas are compiled", async () => {
    const fixturePath = path.join(fixturesDir, "simple-schema.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const stats: BuildStats[] = [];

    await transformCode(code, fixturePath, {
      onBuildStats: (s) => stats.push(s),
    });

    expect(stats).toHaveLength(1);
    expect(stats[0]?.files).toBe(1);
    expect(stats[0]?.schemas).toBeGreaterThanOrEqual(1);
    expect(stats[0]?.optimized).toBeGreaterThanOrEqual(1);
    expect(stats[0]?.failed).toBe(0);
  });

  it("verbose mode logs per-schema compilation status", async () => {
    const fixturePath = path.join(fixturesDir, "simple-schema.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const logSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());

    try {
      await transformCode(code, fixturePath, { verbose: true });
      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("[zod-aot]");
      expect(output).toContain("✓");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("throws when discoverSchemas fails", async () => {
    const code = `import { compile } from "zod-aot";\nexport const v = compile(S);`;
    await expect(transformCode(code, "/nonexistent/bad-file.ts")).rejects.toThrow("[zod-aot]");
  });
});

describe("rewriteSource() — zodCompat option", () => {
  const simpleSchema = z.object({ name: z.string() });

  function makeCompiledInfo(exportName: string, schema: z.ZodType) {
    const ir = extractSchema(schema);
    const codegenResult = generateValidator(ir, exportName);
    return { exportName, codegenResult, fallbackEntries: [] };
  }

  it("uses plain object when zodCompat is false", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(UserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas, { zodCompat: false });

    expect(result).toContain("var __w={}");
    expect(result).not.toContain("Object.create");
  });

  it("uses Object.create when zodCompat is true (default)", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(UserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas, { zodCompat: true });

    expect(result).toContain("Object.create(UserSchema)");
  });
});
