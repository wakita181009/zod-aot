import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import {
  findSchemaFiles,
  generateFile,
  resolveInputFiles,
  runGenerate,
} from "#src/cli/commands/generate.js";
import {
  generateCompiledFileContent,
  resolveOutputPath,
  writeCompiledFile,
} from "#src/cli/emitter.js";
import { generateValidator } from "#src/core/codegen/index.js";
import { extractSchema } from "#src/core/extractor.js";
import type { SafeParseResult } from "#src/core/types.js";
import { discoverSchemas } from "#src/discovery.js";

const fixturesDir = path.resolve(import.meta.dirname, "../../fixtures");
const outputFiles: string[] = [];

afterEach(async () => {
  for (const f of outputFiles) {
    await fs.promises.unlink(f).catch(() => undefined);
  }
  outputFiles.length = 0;
});

describe("resolveInputFiles", () => {
  it("resolves a single file path", async () => {
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    const result = await resolveInputFiles([filePath]);
    expect(result).toEqual([filePath]);
  });

  it("resolves a directory to matching files", async () => {
    const result = await resolveInputFiles([fixturesDir]);
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.every((f) => /\.(?:ts|mts|js|mjs)$/.test(f))).toBe(true);
  });

  it("exits on non-existent path", async () => {
    const exitError = new Error("process.exit");
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw exitError;
    });
    try {
      await expect(resolveInputFiles(["/nonexistent/path.ts"])).rejects.toThrow("process.exit");
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      mockExit.mockRestore();
    }
  });
});

describe("findSchemaFiles", () => {
  it("finds .ts files in a directory", async () => {
    const files = await findSchemaFiles(fixturesDir);
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      expect(f).toMatch(/\.(?:ts|mts|js|mjs)$/);
      expect(f).not.toMatch(/\.compiled\./);
      expect(f).not.toMatch(/\.test\./);
      expect(f).not.toMatch(/\.d\.ts$/);
    }
  });

  it("excludes node_modules, dist, and dotfiles", async () => {
    const files = await findSchemaFiles(fixturesDir);
    for (const f of files) {
      expect(f).not.toContain("node_modules");
      expect(f).not.toContain("/dist/");
    }
  });
});

describe("generateFile", () => {
  it("generates compiled output for a schema file", async () => {
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    const result = await generateFile(filePath, undefined);

    expect(result).not.toBeNull();
    if (!result) return;
    outputFiles.push(result.outputPath);

    expect(result.filePath).toBe(filePath);
    expect(result.outputPath).toContain(".compiled.ts");
    expect(result.schemaCount).toBe(1);
    expect(result.schemaNames).toEqual(["validateUser"]);

    const content = await fs.promises.readFile(result.outputPath, "utf-8");
    expect(content).toContain("function safeParse_validateUser");
  });

  it("generates compiled output for multi-schema file", async () => {
    const filePath = path.join(fixturesDir, "multi-schema.ts");
    const result = await generateFile(filePath, undefined);

    expect(result).not.toBeNull();
    if (!result) return;
    outputFiles.push(result.outputPath);

    expect(result.schemaCount).toBe(2);
    expect(result.schemaNames).toContain("validateUser");
    expect(result.schemaNames).toContain("validateProduct");
  });

  it("returns null for file with no compile() calls", async () => {
    const filePath = path.join(fixturesDir, "no-compile.ts");
    const result = await generateFile(filePath, undefined);
    expect(result).toBeNull();
  });

  it("respects custom output path", async () => {
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    const customOutput = path.join(fixturesDir, "custom-output.compiled.ts");
    const result = await generateFile(filePath, customOutput);

    expect(result).not.toBeNull();
    if (!result) return;
    outputFiles.push(result.outputPath);

    expect(result.outputPath).toBe(customOutput);
  });

  it("throws on non-loadable file", async () => {
    await expect(generateFile("/nonexistent/file.ts", undefined)).rejects.toThrow("Failed to load");
  });
});

describe("runGenerate", () => {
  it("generates files and logs summary", async () => {
    const logSpy = vi.spyOn(await import("#src/cli/logger.js"), "logger", "get");
    const mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy.mockReturnValue(mockLogger);

    try {
      const filePath = path.join(fixturesDir, "simple-schema.ts");
      await runGenerate({ inputs: [filePath], output: undefined });

      const outputPath = resolveOutputPath(filePath, undefined);
      outputFiles.push(outputPath);

      expect(mockLogger.success).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Generated 1 schema"));
    } finally {
      logSpy.mockRestore();
    }
  });

  it("warns when no compile() calls found", async () => {
    const logSpy = vi.spyOn(await import("#src/cli/logger.js"), "logger", "get");
    const mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy.mockReturnValue(mockLogger);

    try {
      await runGenerate({ inputs: [path.join(fixturesDir, "no-compile.ts")], output: undefined });
      expect(mockLogger.warn).toHaveBeenCalledWith("No compile() calls found in any source file.");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("handles multiple schemas with plural summary", async () => {
    const logSpy = vi.spyOn(await import("#src/cli/logger.js"), "logger", "get");
    const mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy.mockReturnValue(mockLogger);

    try {
      await runGenerate({
        inputs: [
          path.join(fixturesDir, "simple-schema.ts"),
          path.join(fixturesDir, "multi-schema.ts"),
        ],
        output: undefined,
      });

      for (const call of mockLogger.success.mock.calls) {
        const msg = call[0] as string;
        if (msg.includes("simple-schema")) {
          outputFiles.push(
            resolveOutputPath(path.join(fixturesDir, "simple-schema.ts"), undefined),
          );
        }
        if (msg.includes("multi-schema")) {
          outputFiles.push(resolveOutputPath(path.join(fixturesDir, "multi-schema.ts"), undefined));
        }
      }

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("3 schemas"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("2 files"));
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe("generate E2E", () => {
  it("generates a compiled file from simple schema and validates correctly", async () => {
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    const schemas = await discoverSchemas(filePath);

    expect(schemas.length).toBe(1);

    const codegenResults = schemas.map((s) => {
      const ir = extractSchema(s.schema);
      const result = generateValidator(ir, s.exportName);
      return { exportName: s.exportName, codegenResult: result, fallbackEntries: [] };
    });

    const outputPath = resolveOutputPath(filePath, undefined);
    outputFiles.push(outputPath);

    const content = generateCompiledFileContent(codegenResults, "./simple-schema.ts");
    await writeCompiledFile(outputPath, content);

    // Verify file was written
    const written = await fs.promises.readFile(outputPath, "utf-8");
    expect(written).toContain("function safeParse_validateUser");
    expect(written).toContain("export const validateUser");

    // Execute the generated safeParse function and verify results
    const schema = schemas[0];
    expect(schema).toBeDefined();
    if (!schema) return;
    const ir = extractSchema(schema.schema);
    const result = generateValidator(ir, schema.exportName);
    const safeParseFn = new Function(`${result.code}\nreturn ${result.functionName};`)() as (
      input: unknown,
    ) => SafeParseResult<unknown>;

    // Valid input
    const validResult = safeParseFn({ name: "Alice", age: 25 });
    expect(validResult.success).toBe(true);

    // Invalid input — missing name
    const invalidResult = safeParseFn({ age: 25 });
    expect(invalidResult.success).toBe(false);

    // Invalid input — negative age
    const invalidAge = safeParseFn({ name: "Alice", age: -5 });
    expect(invalidAge.success).toBe(false);
  });

  it("generates compiled file with multiple schemas", async () => {
    const filePath = path.join(fixturesDir, "multi-schema.ts");
    const schemas = await discoverSchemas(filePath);

    expect(schemas.length).toBe(2);

    const codegenResults = schemas.map((s) => {
      const ir = extractSchema(s.schema);
      const result = generateValidator(ir, s.exportName);
      return { exportName: s.exportName, codegenResult: result, fallbackEntries: [] };
    });

    const outputPath = resolveOutputPath(filePath, undefined);
    outputFiles.push(outputPath);

    const content = generateCompiledFileContent(codegenResults, "./multi-schema.ts");
    await writeCompiledFile(outputPath, content);

    const written = await fs.promises.readFile(outputPath, "utf-8");
    expect(written).toContain("export const validateUser");
    expect(written).toContain("export const validateProduct");
  });

  it("generated validators match Zod behavior for valid data", async () => {
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    const schemas = await discoverSchemas(filePath);
    const schema = schemas[0];
    expect(schema).toBeDefined();
    if (!schema) return;

    const zodSchema = schema.schema as z.ZodType;
    const ir = extractSchema(schema.schema);
    const result = generateValidator(ir, schema.exportName);
    const safeParseFn = new Function(`${result.code}\nreturn ${result.functionName};`)() as (
      input: unknown,
    ) => SafeParseResult<unknown>;

    const validInput = { name: "Bob", age: 30 };
    const zodResult = zodSchema.safeParse(validInput);
    const aotResult = safeParseFn(validInput);

    expect(aotResult.success).toBe(zodResult.success);
  });

  it("generated validators match Zod behavior for invalid data", async () => {
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    const schemas = await discoverSchemas(filePath);
    const schema = schemas[0];
    expect(schema).toBeDefined();
    if (!schema) return;

    const zodSchema = schema.schema as z.ZodType;
    const ir = extractSchema(schema.schema);
    const result = generateValidator(ir, schema.exportName);
    const safeParseFn = new Function(`${result.code}\nreturn ${result.functionName};`)() as (
      input: unknown,
    ) => SafeParseResult<unknown>;

    const invalidInput = { name: "", age: -1 };
    const zodResult = zodSchema.safeParse(invalidInput);
    const aotResult = safeParseFn(invalidInput);

    expect(aotResult.success).toBe(zodResult.success);
    expect(aotResult.success).toBe(false);
  });
});
