import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSourceFile } from "#src/loader.js";

const fixturesDir = path.resolve(import.meta.dirname, "fixtures");
const isNodeRuntime = !("Bun" in globalThis) && !("Deno" in globalThis);

describe("loadSourceFile", () => {
  it("loads TypeScript files on Node.js (via tsx)", async () => {
    const mod = await loadSourceFile(path.join(fixturesDir, "simple-schema.ts"));
    expect(mod).toHaveProperty("validateUser");
  });

  it("supports cacheBust option", async () => {
    const mod = await loadSourceFile(path.join(fixturesDir, "simple-schema.ts"), {
      cacheBust: true,
    });
    expect(mod).toHaveProperty("validateUser");
  });

  it("loads JavaScript files without tsx", async () => {
    const tmpFile = path.join(fixturesDir, "__test_loader.mjs");
    await fs.promises.writeFile(tmpFile, "export const testValue = 42;\n");
    try {
      const mod = await loadSourceFile(tmpFile);
      expect(mod["testValue"]).toBe(42);
    } finally {
      await fs.promises.unlink(tmpFile).catch(() => undefined);
    }
  });

  it("supports cacheBust for JavaScript files", async () => {
    const tmpFile = path.join(fixturesDir, "__test_loader_cb.mjs");
    await fs.promises.writeFile(tmpFile, "export const v = Date.now();\n");
    try {
      const mod = await loadSourceFile(tmpFile, { cacheBust: true });
      expect(mod["v"]).toBeTypeOf("number");
    } finally {
      await fs.promises.unlink(tmpFile).catch(() => undefined);
    }
  });

  it("throws on non-existent file", async () => {
    await expect(loadSourceFile("/nonexistent/file.ts")).rejects.toThrow();
  });
});

// tsx path is Node.js-only; Bun/Deno use native TS imports
describe.skipIf(!isNodeRuntime)("loadSourceFile — tsx unavailable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("throws descriptive error when tsx is not available for .ts files", async () => {
    vi.doMock("tsx/esm/api", () => {
      throw new Error("Cannot find module 'tsx/esm/api'");
    });

    const { loadSourceFile: loadFn } = await import("#src/loader.js");

    await expect(loadFn(path.join(fixturesDir, "simple-schema.ts"))).rejects.toThrow(
      "Cannot load TypeScript file without tsx",
    );
  });
});
