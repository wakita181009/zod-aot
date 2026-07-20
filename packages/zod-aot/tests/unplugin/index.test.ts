import path from "node:path";
import type { UnpluginContextMeta, UnpluginOptions } from "unplugin";
import { describe, expect, it } from "vitest";
import { unplugin } from "#src/unplugin/index.js";
import { VIRTUAL_RUNTIME_ID, WP_RUNTIME_ID } from "#src/unplugin/virtual.js";

const meta = { framework: "vite" } as UnpluginContextMeta;

const COMPILE_FIXTURE = [
  'import { z } from "zod";',
  'import { compile } from "zod-aot";',
  "const UserSchema = z.object({ name: z.string().min(1), age: z.number().int().positive() });",
  "export const validateUser = compile(UserSchema);",
].join("\n");

function makeMeta(framework: string): UnpluginContextMeta {
  return { framework } as unknown as UnpluginContextMeta;
}

describe("unplugin factory", () => {
  it("creates a plugin with correct name", () => {
    const plugin = unplugin.raw({}, meta) as UnpluginOptions;
    expect(plugin.name).toBe("zod-aot");
  });

  it("creates a plugin with enforce: pre", () => {
    const plugin = unplugin.raw({}, meta) as UnpluginOptions;
    expect(plugin.enforce).toBe("pre");
  });

  it("transformInclude delegates to shouldTransform", () => {
    const plugin = unplugin.raw({}, meta) as UnpluginOptions;
    const transformInclude = plugin.transformInclude as (id: string) => boolean;

    expect(transformInclude("/src/schemas.ts")).toBe(true);
    expect(transformInclude("/node_modules/zod/index.ts")).toBe(false);
    expect(transformInclude("/src/types.d.ts")).toBe(false);
    expect(transformInclude("/src/schemas.compiled.ts")).toBe(false);
  });

  it("transformInclude respects plugin options", () => {
    const plugin = unplugin.raw({ exclude: ["generated"] }, meta) as UnpluginOptions;
    const transformInclude = plugin.transformInclude as (id: string) => boolean;

    expect(transformInclude("/src/schemas.ts")).toBe(true);
    expect(transformInclude("/src/generated/schemas.ts")).toBe(false);
  });

  it("transform bails out when code lacks zod-aot reference", async () => {
    const plugin = unplugin.raw({}, meta) as UnpluginOptions;
    const transform = plugin.transform as (code: string, id: string) => Promise<unknown>;

    const result = await transform("export const x = 1;", "/src/test.ts");
    expect(result).toBeUndefined();
  });

  it("transform bails out when code lacks compile reference", async () => {
    const plugin = unplugin.raw({}, meta) as UnpluginOptions;
    const transform = plugin.transform as (code: string, id: string) => Promise<unknown>;

    const result = await transform('import { z } from "zod-aot";', "/src/test.ts");
    expect(result).toBeUndefined();
  });

  it("transform processes valid compile() file", async () => {
    const plugin = unplugin.raw({}, meta) as UnpluginOptions;
    const transform = plugin.transform as (
      code: string,
      id: string,
    ) => Promise<{ code: string; map: null } | undefined>;

    const fixturesDir = path.resolve(import.meta.dirname, "../fixtures");
    const fixturePath = path.join(fixturesDir, "simple-schema.ts");

    const code = [
      'import { z } from "zod";',
      'import { compile } from "zod-aot";',
      "const UserSchema = z.object({ name: z.string().min(1), age: z.number().int().positive() });",
      "export const validateUser = compile(UserSchema);",
    ].join("\n");

    const result = await transform(code, fixturePath);

    expect(result).toBeDefined();
    expect(result?.code).toContain("safeParse_validateUser");
    expect(result?.map).toBeNull();
  });

  it("transform returns cached result for the same file id", async () => {
    const plugin = unplugin.raw({}, meta) as UnpluginOptions;
    const transform = plugin.transform as (
      code: string,
      id: string,
    ) => Promise<{ code: string; map: null } | undefined>;

    const fixturesDir = path.resolve(import.meta.dirname, "../fixtures");
    const fixturePath = path.join(fixturesDir, "simple-schema.ts");

    const code = [
      'import { z } from "zod";',
      'import { compile } from "zod-aot";',
      "const UserSchema = z.object({ name: z.string().min(1), age: z.number().int().positive() });",
      "export const validateUser = compile(UserSchema);",
    ].join("\n");

    const first = await transform(code, fixturePath);
    const second = await transform(code, fixturePath);

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second?.code).toBe(first?.code);
  });

  it("cache is cleared on buildEnd for watch mode", async () => {
    const plugin = unplugin.raw({ verbose: true }, meta) as UnpluginOptions;
    const transform = plugin.transform as (
      code: string,
      id: string,
    ) => Promise<{ code: string; map: null } | undefined>;
    const buildEnd = plugin.buildEnd as () => void;

    const fixturesDir = path.resolve(import.meta.dirname, "../fixtures");
    const fixturePath = path.join(fixturesDir, "simple-schema.ts");

    const code = [
      'import { z } from "zod";',
      'import { compile } from "zod-aot";',
      "const UserSchema = z.object({ name: z.string().min(1), age: z.number().int().positive() });",
      "export const validateUser = compile(UserSchema);",
    ].join("\n");

    // First build cycle
    await transform(code, fixturePath);
    buildEnd();

    // After buildEnd, the same file should be re-processed (not cached)
    const result = await transform(code, fixturePath);
    expect(result).toBeDefined();
    expect(result?.code).toContain("safeParse_validateUser");
  });

  it("verbose stats count each file only once despite duplicate transforms", async () => {
    const logs: string[] = [];
    // biome-ignore lint/suspicious/noConsole: intercept console.log to verify verbose output
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));

    try {
      const plugin = unplugin.raw({ verbose: true }, meta) as UnpluginOptions;
      const transform = plugin.transform as (
        code: string,
        id: string,
      ) => Promise<{ code: string; map: null } | undefined>;
      const buildEnd = plugin.buildEnd as () => void;

      const fixturesDir = path.resolve(import.meta.dirname, "../fixtures");
      const fixturePath = path.join(fixturesDir, "simple-schema.ts");

      const code = [
        'import { z } from "zod";',
        'import { compile } from "zod-aot";',
        "const UserSchema = z.object({ name: z.string().min(1), age: z.number().int().positive() });",
        "export const validateUser = compile(UserSchema);",
      ].join("\n");

      // Simulate webpack calling transform twice for the same file (different layers)
      await transform(code, fixturePath);
      await transform(code, fixturePath);
      buildEnd();

      const summaryLog = logs.find((l) => l.includes("Build summary"));
      expect(summaryLog).toContain("1/1 schemas optimized across 1 file(s)");
    } finally {
      console.log = originalLog;
    }
  });
});

describe("unplugin framework mode selection", () => {
  const fixturePath = path.resolve(import.meta.dirname, "../fixtures/simple-schema.ts");

  type Transform = (code: string, id: string) => Promise<{ code: string; map: null } | undefined>;

  async function transformFor(framework: string) {
    const plugin = unplugin.raw({}, makeMeta(framework)) as UnpluginOptions;
    const transform = plugin.transform as Transform;
    return transform(COMPILE_FIXTURE, fixturePath);
  }

  it("rsbuild uses lean mode via the bare-specifier runtime (rspack-based)", async () => {
    const result = await transformFor("rsbuild");
    expect(result?.code).toContain(`from "${WP_RUNTIME_ID}"`);
    expect(result?.code).not.toContain(VIRTUAL_RUNTIME_ID);
  });

  it("rspack and webpack share the bare-specifier runtime path", async () => {
    for (const framework of ["rspack", "webpack"]) {
      const result = await transformFor(framework);
      expect(result?.code).toContain(`from "${WP_RUNTIME_ID}"`);
      expect(result?.code).not.toContain(VIRTUAL_RUNTIME_ID);
    }
  });

  it("virtual-module bundlers import from the virtual: runtime", async () => {
    for (const framework of ["vite", "rollup", "rolldown", "esbuild", "farm", "bun"]) {
      const result = await transformFor(framework);
      expect(result?.code).toContain(`from "${VIRTUAL_RUNTIME_ID}"`);
    }
  });
});
