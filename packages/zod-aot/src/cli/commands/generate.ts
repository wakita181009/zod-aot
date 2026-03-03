import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { generateValidator } from "../../codegen/index.js";
import { extractSchema } from "../../extractor/index.js";
import type { DiscoveredSchema } from "../discovery.js";
import { discoverSchemas } from "../discovery.js";
import { generateCompiledFileContent, resolveOutputPath, writeCompiledFile } from "../emitter.js";
import { logger } from "../logger.js";

interface GenerateOptions {
  inputs: string[];
  output: string | undefined;
}

/**
 * Resolve input paths to a list of source files.
 * If a path is a directory, find all .ts files (excluding .compiled.ts, .test.ts, node_modules).
 */
async function resolveInputFiles(inputs: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const input of inputs) {
    const absPath = path.resolve(input);
    const stat = await fs.promises.stat(absPath).catch(() => null);

    if (!stat) {
      logger.error(`File not found: ${input}`);
      process.exit(1);
    }

    if (stat.isDirectory()) {
      const found = await findSchemaFiles(absPath);
      files.push(...found);
    } else {
      files.push(absPath);
    }
  }

  return files;
}

async function findSchemaFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) {
        continue;
      }
      const nested = await findSchemaFiles(fullPath);
      results.push(...nested);
    } else if (
      entry.isFile() &&
      /\.(?:ts|mts|js|mjs)$/.test(entry.name) &&
      !entry.name.endsWith(".compiled.ts") &&
      !entry.name.endsWith(".compiled.js") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.js") &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

export async function runGenerate(options: GenerateOptions): Promise<void> {
  const files = await resolveInputFiles(options.inputs);

  if (files.length === 0) {
    logger.warn("No source files found.");
    return;
  }

  let totalSchemas = 0;
  let totalFiles = 0;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);

    let schemas: DiscoveredSchema[];
    try {
      schemas = await discoverSchemas(filePath);
    } catch (err) {
      logger.error(
        `Failed to load ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }

    if (schemas.length === 0) {
      continue;
    }

    const codegenResults = schemas.map((s) => {
      const ir = extractSchema(s.schema);
      const result = generateValidator(ir, s.exportName);
      return { exportName: s.exportName, codegenResult: result };
    });

    const outputPath = resolveOutputPath(filePath, options.output);
    const outputRelPath = path.relative(process.cwd(), outputPath);
    const sourceRelPath = path.relative(path.dirname(outputPath), filePath);
    const content = generateCompiledFileContent(codegenResults, sourceRelPath);

    await writeCompiledFile(outputPath, content);

    const schemaNames = schemas.map((s) => s.exportName).join(", ");
    logger.success(`${relPath} -> ${outputRelPath} (${schemaNames})`);

    totalSchemas += schemas.length;
    totalFiles++;
  }

  if (totalFiles === 0) {
    logger.warn("No compile() calls found in any source file.");
  } else {
    logger.info(
      `Generated ${totalSchemas} schema${totalSchemas > 1 ? "s" : ""} from ${totalFiles} file${totalFiles > 1 ? "s" : ""}.`,
    );
  }
}
