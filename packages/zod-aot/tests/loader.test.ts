import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadSourceFile } from "#src/loader.js";

const fixturesDir = path.resolve(import.meta.dirname, "fixtures");

describe("loadSourceFile", () => {
  it("loads TypeScript files", async () => {
    const mod = await loadSourceFile(path.join(fixturesDir, "simple-schema.ts"));
    expect(mod).toHaveProperty("validateUser");
  });

  it("supports cacheBust option", async () => {
    const mod = await loadSourceFile(path.join(fixturesDir, "simple-schema.ts"), {
      cacheBust: true,
    });
    expect(mod).toHaveProperty("validateUser");
  });

  it("loads JavaScript files", async () => {
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

  it("loads TypeScript files with extensionless imports", async () => {
    const mod = await loadSourceFile(path.join(fixturesDir, "extensionless", "schema.ts"));
    expect(mod).toHaveProperty("validateUser");
  });

  it("loads TypeScript files with enum declarations", async () => {
    const mod = await loadSourceFile(path.join(fixturesDir, "with-enum.ts"));
    expect(mod).toHaveProperty("validateItem");
  });
});
