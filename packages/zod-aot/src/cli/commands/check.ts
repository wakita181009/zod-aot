import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { extractSchema } from "#src/core/extract/index.js";
import type { SchemaIR } from "#src/core/types.js";
import type { DiscoveredSchema } from "#src/discovery.js";
import { discoverSchemas } from "#src/discovery.js";
import { getErrorMessage } from "../errors.js";
import { logger } from "../logger.js";

interface CoverageResult {
  total: number;
  compilable: number;
  fallbacks: { reason: string; path: string }[];
}

function countNodes(ir: SchemaIR, currentPath = ""): CoverageResult {
  if (ir.type === "fallback") {
    return {
      total: 1,
      compilable: 0,
      fallbacks: [{ reason: ir.reason, path: currentPath || "." }],
    };
  }

  if (ir.type === "object") {
    let total = 0;
    let compilable = 0;
    const fallbacks: CoverageResult["fallbacks"] = [];
    for (const [key, prop] of Object.entries(ir.properties)) {
      const r = countNodes(prop, `${currentPath}.${key}`);
      total += r.total;
      compilable += r.compilable;
      fallbacks.push(...r.fallbacks);
    }
    return { total, compilable, fallbacks };
  }

  if (ir.type === "array") {
    return countNodes(ir.element, `${currentPath}[]`);
  }

  if (ir.type === "optional" || ir.type === "nullable" || ir.type === "readonly") {
    return countNodes(ir.inner, currentPath);
  }

  if (ir.type === "default" || ir.type === "catch") {
    return countNodes(ir.inner, currentPath);
  }

  if (ir.type === "union" || ir.type === "discriminatedUnion") {
    let total = 0;
    let compilable = 0;
    const fallbacks: CoverageResult["fallbacks"] = [];
    for (const [i, opt] of ir.options.entries()) {
      const r = countNodes(opt, `${currentPath}[${i}]`);
      total += r.total;
      compilable += r.compilable;
      fallbacks.push(...r.fallbacks);
    }
    return { total, compilable, fallbacks };
  }

  if (ir.type === "tuple") {
    let total = 0;
    let compilable = 0;
    const fallbacks: CoverageResult["fallbacks"] = [];
    for (const [i, item] of ir.items.entries()) {
      const r = countNodes(item, `${currentPath}[${i}]`);
      total += r.total;
      compilable += r.compilable;
      fallbacks.push(...r.fallbacks);
    }
    if (ir.rest) {
      const r = countNodes(ir.rest, `${currentPath}[...rest]`);
      total += r.total;
      compilable += r.compilable;
      fallbacks.push(...r.fallbacks);
    }
    return { total, compilable, fallbacks };
  }

  if (ir.type === "record") {
    const kr = countNodes(ir.keyType, `${currentPath}[key]`);
    const vr = countNodes(ir.valueType, `${currentPath}[value]`);
    return {
      total: kr.total + vr.total,
      compilable: kr.compilable + vr.compilable,
      fallbacks: [...kr.fallbacks, ...vr.fallbacks],
    };
  }

  if (ir.type === "intersection") {
    const lr = countNodes(ir.left, `${currentPath}[left]`);
    const rr = countNodes(ir.right, `${currentPath}[right]`);
    return {
      total: lr.total + rr.total,
      compilable: lr.compilable + rr.compilable,
      fallbacks: [...lr.fallbacks, ...rr.fallbacks],
    };
  }

  if (ir.type === "set") {
    return countNodes(ir.valueType, `${currentPath}[element]`);
  }

  if (ir.type === "map") {
    const kr = countNodes(ir.keyType, `${currentPath}[key]`);
    const vr = countNodes(ir.valueType, `${currentPath}[value]`);
    return {
      total: kr.total + vr.total,
      compilable: kr.compilable + vr.compilable,
      fallbacks: [...kr.fallbacks, ...vr.fallbacks],
    };
  }

  if (ir.type === "pipe") {
    const ir2 = countNodes(ir.in, `${currentPath}[in]`);
    const or2 = countNodes(ir.out, `${currentPath}[out]`);
    return {
      total: ir2.total + or2.total,
      compilable: ir2.compilable + or2.compilable,
      fallbacks: [...ir2.fallbacks, ...or2.fallbacks],
    };
  }

  // Leaf node (string, number, boolean, bigint, date, literal, enum,
  // symbol, null, undefined, void, nan, never, any, unknown, recursiveRef, templateLiteral)
  return { total: 1, compilable: 1, fallbacks: [] };
}

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
      const coverage = countNodes(ir);
      const pct =
        coverage.total > 0 ? Math.round((coverage.compilable / coverage.total) * 100) : 100;

      if (coverage.fallbacks.length > 0) {
        const reasons = coverage.fallbacks.map((f) => `${f.reason} at ${f.path}`).join(", ");
        logger.warn(`${s.exportName} — ${pct}% compiled (fallback: ${reasons})`);
      } else {
        logger.success(`${s.exportName} — ${pct}% compiled`);
        hasCompilable = true;
      }
    }
  }

  if (!hasCompilable) {
    process.exit(1);
  }
}
