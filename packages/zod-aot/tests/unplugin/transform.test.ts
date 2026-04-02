import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import {
  type BuildStats,
  findExpressionEnd,
  removeCompileImport,
  rewriteSource,
  rewriteSourceAutoDiscover,
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

  it("supports glob patterns in exclude", () => {
    expect(shouldTransform("/src/lib/env.ts", { exclude: ["**/lib/env.ts"] })).toBe(false);
    expect(shouldTransform("/src/schemas.ts", { exclude: ["**/lib/env.ts"] })).toBe(true);
  });

  it("supports glob patterns in include", () => {
    expect(shouldTransform("/src/schemas.ts", { include: ["**/schemas/**"] })).toBe(false);
    expect(shouldTransform("/src/schemas/user.ts", { include: ["**/schemas/**"] })).toBe(true);
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

  it("IIFE references __msg (injection handled by transformCode)", () => {
    const code = [
      `import { z } from "zod";`,
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(UserSchema);`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    // rewriteSource itself no longer injects the config import
    // (that's done by injectZodConfigImport in transformCode).
    // But the IIFE still uses __msg.
    expect(result).toContain("__msg");
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

  it("skips replacement when closing paren is not found (unmatched parens)", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateUser = compile(UserSchema;`,
    ].join("\n");

    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    // Code should be unchanged except compile import removal
    expect(result).not.toContain("safeParse_validateUser");
    expect(result).toContain("compile(UserSchema;");
  });

  it("skips schema when export name does not match code (no regex match)", () => {
    const code = [
      `import { compile } from "zod-aot";`,
      `export const validateProduct = compile(ProductSchema);`,
    ].join("\n");

    // Schema name "validateUser" does not exist in the code
    const schemas = [makeCompiledInfo("validateUser", simpleSchema)];
    const result = rewriteSource(code, schemas);

    // Code should be unchanged (except compile import removal)
    expect(result).not.toContain("safeParse_validateUser");
    expect(result).toContain("validateProduct = compile(ProductSchema)");
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

describe("transformCode() E2E", () => {
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

  it("returns null when code has compile import but no exported compiled schemas", async () => {
    const fixturePath = path.join(fixturesDir, "no-compile.ts");
    // Inject "zod-aot" and "compile" strings to pass bail-out, but the file has no compile() calls
    const code = `import { compile } from "zod-aot";\nimport { z } from "zod";\nconst Schema = z.object({ name: z.string() });\n`;
    const result = await transformCode(code, fixturePath);
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

  it("does not inject duplicate __zodAotConfig import", async () => {
    const fixturePath = path.join(fixturesDir, "simple-schema.ts");
    const baseCode = readFixtureAsUserCode(fixturePath);
    // Pre-inject the __zodAotConfig import to simulate already present
    const code = `import { config as __zodAotConfig } from "zod";\n${baseCode}`;

    const result = await transformCode(code, fixturePath);

    expect(result).not.toBeNull();
    // Should NOT add a second config import line
    const importLines = result
      ?.split("\n")
      .filter((l) => l.includes("import { config as __zodAotConfig }"));
    expect(importLines).toHaveLength(1);
  });

  it("verbose mode logs fallback count (singular)", async () => {
    const fixturePath = path.join(fixturesDir, "with-fallback.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const logSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());

    try {
      await transformCode(code, fixturePath, { verbose: true });
      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("1 fallback)");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("verbose mode logs fallback count (plural)", async () => {
    const fixturePath = path.join(fixturesDir, "with-multi-fallback.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const logSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());

    try {
      await transformCode(code, fixturePath, { verbose: true });
      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("fallbacks)");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("throws when discoverSchemas fails", async () => {
    const code = `import { compile } from "zod-aot";\nexport const v = compile(S);`;
    await expect(transformCode(code, "/nonexistent/bad-file.ts")).rejects.toThrow("[zod-aot]");
  });
});

describe("findExpressionEnd()", () => {
  it("finds end of simple expression", () => {
    const code = "const x = z.string();";
    const end = findExpressionEnd(code, 10); // starts at z.string()
    expect(code.slice(10, end)).toBe("z.string()");
  });

  it("finds end of nested object expression", () => {
    const code = "const x = z.object({ a: z.string() });";
    const end = findExpressionEnd(code, 10);
    expect(code.slice(10, end)).toBe("z.object({ a: z.string() })");
  });

  it("finds end of multi-line expression", () => {
    const code = "const x = z.object({\n  a: z.string(),\n  b: z.number(),\n});";
    const end = findExpressionEnd(code, 10);
    expect(code.slice(10, end)).toContain("z.object(");
    expect(code.slice(10, end)).toContain("b: z.number()");
  });

  it("finds end of expression with regex literal", () => {
    const code = "const x = z.string().regex(/[a-z]+/);";
    const end = findExpressionEnd(code, 10);
    expect(code.slice(10, end)).toBe("z.string().regex(/[a-z]+/)");
  });

  it("returns -1 for unparseable expression", () => {
    const code = "const x = @@@invalid;";
    const end = findExpressionEnd(code, 10);
    expect(end).toBe(-1);
  });
});

describe("rewriteSourceAutoDiscover()", () => {
  const simpleSchema = z.object({ name: z.string() });

  function makeCompiledInfo(exportName: string, schema: z.ZodType) {
    const ir = extractSchema(schema);
    const codegenResult = generateValidator(ir, exportName);
    return { exportName, codegenResult, fallbackEntries: [] };
  }

  it("skips schema when export pattern does not match code", () => {
    const code = `import { z } from "zod";\nexport const OtherSchema = z.string();`;
    const schemas = [makeCompiledInfo("UserSchema", simpleSchema)];
    const result = rewriteSourceAutoDiscover(code, schemas);

    // Code should be unchanged
    expect(result).toBe(code);
  });

  it("skips schema when expression is unparseable", () => {
    const code = `import { z } from "zod";\nexport const UserSchema = @@@invalid;`;
    const schemas = [makeCompiledInfo("UserSchema", simpleSchema)];
    const result = rewriteSourceAutoDiscover(code, schemas);

    // Code should be unchanged
    expect(result).toBe(code);
  });

  it("replaces a single schema export with IIFE", () => {
    const code = `import { z } from "zod";\nexport const UserSchema = z.object({ name: z.string() });`;
    const schemas = [makeCompiledInfo("UserSchema", simpleSchema)];
    const result = rewriteSourceAutoDiscover(code, schemas);

    expect(result).toContain("/* @__PURE__ */");
    expect(result).toContain("safeParse_UserSchema");
    expect(result).toContain("Object.create(z.object({ name: z.string() })");
  });

  it("replaces multiple schema exports", () => {
    const code = [
      `import { z } from "zod";`,
      `export const A = z.object({ x: z.string() });`,
      `export const B = z.object({ y: z.number() });`,
    ].join("\n");
    const schemas = [
      makeCompiledInfo("A", z.object({ x: z.string() })),
      makeCompiledInfo("B", z.object({ y: z.number() })),
    ];
    const result = rewriteSourceAutoDiscover(code, schemas);

    expect(result).toContain("safeParse_A");
    expect(result).toContain("safeParse_B");
  });

  it("handles schema with type annotation", () => {
    const code = `import { z } from "zod";\nexport const UserSchema: z.ZodObject<{ name: z.ZodString }> = z.object({ name: z.string() });`;
    const schemas = [makeCompiledInfo("UserSchema", simpleSchema)];
    const result = rewriteSourceAutoDiscover(code, schemas);

    expect(result).toContain("safeParse_UserSchema");
    expect(result).toContain("/* @__PURE__ */");
  });

  it("uses plain object when zodCompat is false", () => {
    const code = `import { z } from "zod";\nexport const UserSchema = z.object({ name: z.string() });`;
    const schemas = [makeCompiledInfo("UserSchema", simpleSchema)];
    const result = rewriteSourceAutoDiscover(code, schemas, { zodCompat: false });

    expect(result).toContain("var __w={}");
    expect(result).not.toContain("Object.create");
  });

  it("IIFE references __msg (injection handled by transformCode)", () => {
    const code = `import { z } from "zod";\nexport const UserSchema = z.object({ name: z.string() });`;
    const schemas = [makeCompiledInfo("UserSchema", simpleSchema)];
    const result = rewriteSourceAutoDiscover(code, schemas);

    // rewriteSourceAutoDiscover itself no longer injects the config import
    // (that's done by injectZodConfigImport in transformCode).
    // But the IIFE still uses __msg.
    expect(result).toContain("__msg");
  });
});

describe("transformCode() — autoDiscover", () => {
  it("transforms a simple Zod file with autoDiscover", async () => {
    const fixturePath = path.join(fixturesDir, "auto-discover-simple.ts");
    const code = readFixtureAsUserCode(fixturePath);

    const result = await transformCode(code, fixturePath, { autoDiscover: true });

    expect(result).not.toBeNull();
    expect(result).toContain("safeParse_UserSchema");
    expect(result).toContain("/* @__PURE__ */");
  });

  it("transforms multiple Zod exports with autoDiscover", async () => {
    const fixturePath = path.join(fixturesDir, "auto-discover-multi.ts");
    const code = readFixtureAsUserCode(fixturePath);

    const result = await transformCode(code, fixturePath, { autoDiscover: true });

    expect(result).not.toBeNull();
    expect(result).toContain("safeParse_UserSchema");
    expect(result).toContain("safeParse_ProductSchema");
  });

  it("handles mixed compile() + autoDiscover with two-pass rewrite", async () => {
    const fixturePath = path.join(fixturesDir, "auto-discover-mixed.ts");
    const code = readFixtureAsUserCode(fixturePath);

    const result = await transformCode(code, fixturePath, { autoDiscover: true });

    expect(result).not.toBeNull();
    // compile() schema should be rewritten
    expect(result).toContain("safeParse_validateUser");
    // autoDiscover schema should also be rewritten
    expect(result).toContain("safeParse_ProductSchema");
    // compile import should be removed by rewriteSource pass
    expect(result).not.toContain('from "zod-aot"');
  });

  it("autoDiscover with only compile() schemas (no plain Zod exports)", async () => {
    const fixturePath = path.join(fixturesDir, "simple-schema.ts");
    const code = readFixtureAsUserCode(fixturePath);

    const result = await transformCode(code, fixturePath, { autoDiscover: true });

    expect(result).not.toBeNull();
    expect(result).toContain("safeParse_validateUser");
    // compile import should be removed
    expect(result).not.toContain('from "zod-aot"');
  });

  it("returns null when no runtime Zod import in autoDiscover mode", async () => {
    const code = `export const x = 1;`;
    const result = await transformCode(code, "/fake/path.ts", { autoDiscover: true });

    expect(result).toBeNull();
  });

  it("returns null for type-only Zod import in autoDiscover mode", async () => {
    const code = `import type { z } from "zod";\nexport const x = 1;`;
    const result = await transformCode(code, "/fake/path.ts", { autoDiscover: true });

    expect(result).toBeNull();
  });

  it("returns null (does not throw) when file loading fails in autoDiscover mode", async () => {
    const code = `import { z } from "zod";\nexport const v = z.string();`;
    const result = await transformCode(code, "/nonexistent/bad-file.ts", { autoDiscover: true });

    expect(result).toBeNull();
  });

  it("logs warning when file loading fails in autoDiscover verbose mode", async () => {
    const code = `import { z } from "zod";\nexport const v = z.string();`;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());

    try {
      const result = await transformCode(code, "/nonexistent/bad-file.ts", {
        autoDiscover: true,
        verbose: true,
      });

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping /nonexistent/bad-file.ts"),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("calls onBuildStats in autoDiscover mode", async () => {
    const fixturePath = path.join(fixturesDir, "auto-discover-simple.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const stats: BuildStats[] = [];

    await transformCode(code, fixturePath, {
      autoDiscover: true,
      onBuildStats: (s) => stats.push(s),
    });

    expect(stats).toHaveLength(1);
    expect(stats[0]?.optimized).toBeGreaterThanOrEqual(1);
  });

  it("verbose mode logs auto-discovering status (single export)", async () => {
    const fixturePath = path.join(fixturesDir, "auto-discover-simple.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const logSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());

    try {
      await transformCode(code, fixturePath, { autoDiscover: true, verbose: true });
      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Auto-discovering");
      expect(output).toContain("1 Zod export found");
      expect(output).toContain("✓");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("verbose mode logs auto-discovering status (multiple exports)", async () => {
    const fixturePath = path.join(fixturesDir, "auto-discover-multi.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const logSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());

    try {
      await transformCode(code, fixturePath, { autoDiscover: true, verbose: true });
      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Auto-discovering");
      expect(output).toContain("exports found");
      expect(output).toContain("✓");
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe("transformCode() — compilation failure paths", () => {
  it("warns and continues when a schema fails to compile", async () => {
    const fixturePath = path.join(fixturesDir, "with-broken-schema.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());

    try {
      const result = await transformCode(code, fixturePath);
      // goodValidator should be compiled, brokenValidator should fail
      expect(result).not.toBeNull();
      expect(result).toContain("safeParse_goodValidator");
      // warn() should have been called for brokenValidator
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to compile "brokenValidator"'),
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("compile()"));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("warns without 'compile()' mention in autoDiscover mode", async () => {
    const fixturePath = path.join(fixturesDir, "with-broken-schema.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());

    try {
      await transformCode(code, fixturePath, { autoDiscover: true });
      const warnMsg = warnSpy.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("brokenValidator"),
      )?.[0] as string;
      expect(warnMsg).toContain("Keeping original");
      expect(warnMsg).not.toContain("compile()");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("verbose mode logs failed schema count", async () => {
    const fixturePath = path.join(fixturesDir, "with-broken-schema.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());
    const logSpy = vi.spyOn(console, "log").mockImplementation(vi.fn());

    try {
      await transformCode(code, fixturePath, { verbose: true });
      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("1 schema(s) failed");
    } finally {
      warnSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it("returns null when all schemas fail to compile", async () => {
    const fixturePath = path.join(fixturesDir, "all-broken-schemas.ts");
    const code = readFixtureAsUserCode(fixturePath);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(vi.fn());

    try {
      const result = await transformCode(code, fixturePath);
      expect(result).toBeNull();
      // Both schemas should have triggered warnings
      expect(warnSpy).toHaveBeenCalledTimes(2);
    } finally {
      warnSpy.mockRestore();
    }
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
