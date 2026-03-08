import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { extractSchema } from "#src/core/extract/index.js";
import type { DiscoveredSchema } from "#src/discovery.js";
import { discoverSchemas } from "#src/discovery.js";
import { getErrorMessage } from "../errors.js";
import { hasFallback } from "../fallback.js";
import { logger } from "../logger.js";

interface CheckOptions {
  inputs: string[];
}

export async function runCheck(options: CheckOptions): Promise<void> {
  const files: string[] = [];

  for (const input of options.inputs) {
    const absPath = path.resolve(input);
    const stat = await fs.promises.stat(absPath).catch(() => null);

    if (!stat) {
      logger.error(`File not found: ${input}`);
      process.exit(1);
    }

    if (stat.isDirectory()) {
      logger.error("check command expects file paths, not directories.");
      process.exit(1);
    }

    files.push(absPath);
  }

  let hasCompilable = false;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);

    let schemas: DiscoveredSchema[];
    try {
      schemas = await discoverSchemas(filePath);
    } catch (err) {
      logger.error(`Failed to load ${relPath}: ${getErrorMessage(err)}`);
      process.exit(1);
    }

    if (schemas.length === 0) {
      logger.warn(`${relPath}: no compile() calls found`);
      continue;
    }

    for (const s of schemas) {
      const ir = extractSchema(s.schema);
      const fallbackReason = hasFallback(ir);

      if (fallbackReason) {
        logger.warn(`${s.exportName} — partial (fallback: ${fallbackReason})`);
      } else {
        logger.success(`${s.exportName} — compilable`);
        hasCompilable = true;
      }
    }
  }

  if (!hasCompilable) {
    process.exit(1);
  }
}
