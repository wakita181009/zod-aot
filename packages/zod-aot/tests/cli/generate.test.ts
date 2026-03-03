import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { z } from "zod";
import { discoverSchemas } from "../../src/cli/discovery.js";
import {
  generateCompiledFileContent,
  resolveOutputPath,
  writeCompiledFile,
} from "../../src/cli/emitter.js";
import { generateValidator } from "../../src/codegen/index.js";
import { extractSchema } from "../../src/extractor/index.js";
import type { SafeParseResult } from "../../src/types.js";

const fixturesDir = path.resolve(import.meta.dirname, "fixtures");
const outputFiles: string[] = [];

afterEach(async () => {
  for (const f of outputFiles) {
    await fs.promises.unlink(f).catch(() => undefined);
  }
  outputFiles.length = 0;
});

describe("generate E2E", () => {
  it("generates a compiled file from simple schema and validates correctly", async () => {
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    const schemas = await discoverSchemas(filePath);

    expect(schemas.length).toBe(1);

    const codegenResults = schemas.map((s) => {
      const ir = extractSchema(s.schema);
      const result = generateValidator(ir, s.exportName);
      return { exportName: s.exportName, codegenResult: result };
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
    const schema = schemas[0]!;
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
      return { exportName: s.exportName, codegenResult: result };
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
    const schema = schemas[0]!;

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
    const schema = schemas[0]!;

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
