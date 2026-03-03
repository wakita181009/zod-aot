import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { extractSchema } from "#src/core/extractor.js";
import type { SchemaIR } from "#src/core/types.js";
import type { DiscoveredSchema } from "#src/discovery.js";
import { discoverSchemas } from "#src/discovery.js";
import { logger } from "../logger.js";

interface CheckOptions {
  inputs: string[];
}

function hasFallback(ir: SchemaIR): string | null {
  if (ir.type === "fallback") {
    return ir.reason;
  }
  if (ir.type === "object") {
    for (const [key, prop] of Object.entries(ir.properties)) {
      const reason = hasFallback(prop);
      if (reason) return `${reason} at .${key}`;
    }
  }
  if (ir.type === "array") {
    return hasFallback(ir.element);
  }
  if (ir.type === "optional" || ir.type === "nullable" || ir.type === "readonly") {
    return hasFallback(ir.inner);
  }
  if (ir.type === "default") {
    return hasFallback(ir.inner);
  }
  if (ir.type === "union" || ir.type === "discriminatedUnion") {
    for (const opt of ir.options) {
      const reason = hasFallback(opt);
      if (reason) return reason;
    }
  }
  if (ir.type === "tuple") {
    for (const item of ir.items) {
      const reason = hasFallback(item);
      if (reason) return reason;
    }
    if (ir.rest) return hasFallback(ir.rest);
  }
  if (ir.type === "record") {
    return hasFallback(ir.keyType) ?? hasFallback(ir.valueType);
  }
  if (ir.type === "intersection") {
    return hasFallback(ir.left) ?? hasFallback(ir.right);
  }
  return null;
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
      logger.error(
        `Failed to load ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
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
