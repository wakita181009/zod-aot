import { parseExpressionAt } from "acorn";
import picomatch from "picomatch";
import { generateIIFE, ZOD_CONFIG_IMPORT, ZOD_MSG_DECLARATION } from "#src/core/iife.js";
import { type CompiledSchemaInfo, compileSchemas } from "#src/core/pipeline.js";
import type { DiscoveredSchema } from "#src/core/types.js";
import { discoverSchemas } from "#src/discovery.js";
import type { ZodAotPluginOptions } from "./types.js";

/** Matches a runtime (non-type-only) import from "zod". */
const HAS_RUNTIME_ZOD_IMPORT = /import\s+(?!type\s)[^;]*from\s+["']zod["']/;

/**
 * Check if a file should be transformed by the plugin.
 */
export function shouldTransform(id: string, options?: ZodAotPluginOptions): boolean {
  if (!/\.[cm]?[jt]sx?$/.test(id)) return false;
  if (id.includes("node_modules")) return false;
  if (id.endsWith(".d.ts")) return false;
  if (id.endsWith(".compiled.ts") || id.endsWith(".compiled.js")) return false;

  if (options?.exclude?.some((pattern) => picomatch.isMatch(id, pattern, { contains: true })))
    return false;
  if (
    options?.include &&
    !options.include.some((pattern) => picomatch.isMatch(id, pattern, { contains: true }))
  )
    return false;

  return true;
}

export interface BuildStats {
  files: number;
  schemas: number;
  optimized: number;
  failed: number;
}

interface TransformOptions {
  zodCompat?: boolean | undefined;
  verbose?: boolean | undefined;
  autoDiscover?: boolean | undefined;
  onBuildStats?: (stats: BuildStats) => void;
}

export function log(msg: string): void {
  // biome-ignore lint/suspicious/noConsole: build output
  console.log(`[zod-aot] ${msg}`);
}

function warn(msg: string): void {
  // biome-ignore lint/suspicious/noConsole: build output
  console.warn(`[zod-aot] ${msg}`);
}

/**
 * Transform source code by replacing compile() calls with optimized validators.
 * Returns the transformed code or null if no transformation was needed.
 */
export async function transformCode(
  code: string,
  id: string,
  options?: TransformOptions,
): Promise<string | null> {
  const verbose = options?.verbose === true;
  const autoDiscover = options?.autoDiscover === true;

  // Quick bail-out check
  if (autoDiscover) {
    // autoDiscover: any file with a runtime Zod import is a candidate.
    // Skip `import type` — these files have no runtime schemas.
    if (!HAS_RUNTIME_ZOD_IMPORT.test(code)) return null;
  } else {
    // Legacy mode: require compile() from zod-aot
    if (!code.includes("zod-aot") || !code.includes("compile")) return null;
  }

  // Discover schemas by executing the file (with cache busting for HMR)
  let schemas: DiscoveredSchema[];
  try {
    schemas = await discoverSchemas(id, { cacheBust: true, autoDiscover });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // In autoDiscover mode, files that can't be loaded (JSX components,
    // unresolved path aliases, etc.) are expected — warn and skip.
    if (autoDiscover) {
      if (verbose) {
        warn(`Skipping ${id}: ${msg}`);
      }
      return null;
    }
    throw new Error(`[zod-aot] Failed to load schemas from ${id}: ${msg}`);
  }
  if (schemas.length === 0) return null;

  // For each schema, run the compilation pipeline
  let failedCount = 0;
  const compiled = compileSchemas(schemas, {
    onError(exportName, error) {
      failedCount++;
      warn(
        `Failed to compile "${exportName}" in ${id}: ${error.message}. Keeping original${autoDiscover ? "" : " compile()"} call.`,
      );
    },
  });

  if (verbose) {
    if (autoDiscover) {
      log(
        `Auto-discovering: ${id} (${schemas.length} Zod export${schemas.length > 1 ? "s" : ""} found)`,
      );
    }
    for (const s of compiled) {
      const fbCount = s.fallbackEntries.length;
      const fbSuffix = fbCount > 0 ? ` (${fbCount} fallback${fbCount > 1 ? "s" : ""})` : "";
      log(`  ✓ ${s.exportName}${fbSuffix}`);
    }
    if (failedCount > 0) {
      log(`  ✗ ${failedCount} schema(s) failed`);
    }
  }

  if (compiled.length === 0) return null;

  // Report build stats only when at least one schema was compiled
  options?.onBuildStats?.({
    files: 1,
    schemas: schemas.length,
    optimized: compiled.length,
    failed: failedCount,
  });

  // Two-pass rewrite: separate compile() schemas from autoDiscover schemas
  if (autoDiscover) {
    // Detect compile() schemas by checking source code patterns
    const compileExportNames = new Set<string>();
    for (const s of compiled) {
      const pattern = new RegExp(`\\b${s.exportName}\\s*=\\s*compile[\\s<(]`);
      if (pattern.test(code)) {
        compileExportNames.add(s.exportName);
      }
    }
    const compileSchemaInfos = compiled.filter((s) => compileExportNames.has(s.exportName));
    const autoDiscoverSchemaInfos = compiled.filter((s) => !compileExportNames.has(s.exportName));

    let result = code;
    // Pass 1: rewrite compile() schemas with existing function
    if (compileSchemaInfos.length > 0) {
      result = rewriteSource(result, compileSchemaInfos, { zodCompat: options?.zodCompat });
    }
    // Pass 2: rewrite autoDiscover schemas with new function
    if (autoDiscoverSchemaInfos.length > 0) {
      result = rewriteSourceAutoDiscover(result, autoDiscoverSchemaInfos, {
        zodCompat: options?.zodCompat,
      });
    }
    return injectZodConfigImport(result);
  }

  return injectZodConfigImport(rewriteSource(code, compiled, { zodCompat: options?.zodCompat }));
}

/**
 * Add zod config import for __msg (localeError) if needed.
 * Called once after all rewrite passes to avoid duplicate imports.
 */
function injectZodConfigImport(code: string): string {
  if (!code.includes("__msg")) return code;
  if (code.includes("__zodAotConfig")) return code;
  return [ZOD_CONFIG_IMPORT, ZOD_MSG_DECLARATION, code].join("\n");
}

/**
 * Find the matching closing parenthesis for a compile() call,
 * handling nested parentheses like compile(z.object({...})).
 * Returns the index of the closing ')' or -1 if not found.
 */
function findMatchingParen(code: string, openIndex: number): number {
  let depth = 1;
  for (let i = openIndex + 1; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Rewrite source code by replacing compile() calls with IIFE-wrapped optimized validators.
 */
export function rewriteSource(
  code: string,
  schemas: CompiledSchemaInfo[],
  options?: { zodCompat?: boolean | undefined },
): string {
  let result = code;

  for (const schema of schemas) {
    // Match: <exportName> = compile<...>( with word boundary to prevent substring matches
    const prefixPattern = new RegExp(
      `(\\b${schema.exportName}\\s*=\\s*)compile\\s*(?:<[^>]*(?:<[^>]*>[^>]*)?>)?\\s*\\(`,
    );
    const match = prefixPattern.exec(result);
    if (!match) continue;

    // Find the matching closing paren (handles nested parens)
    const openParenIndex = match.index + match[0].length - 1;
    const closeParenIndex = findMatchingParen(result, openParenIndex);
    if (closeParenIndex === -1) continue;

    const schemaArgName = result
      .slice(openParenIndex + 1, closeParenIndex)
      .trim()
      .replace(/,\s*$/, "");
    const prefix = match[1] ?? "";
    const fullMatch = result.slice(match.index, closeParenIndex + 1);
    const replacement = prefix + generateIIFE(schemaArgName, schema, options);
    result = result.replace(fullMatch, replacement);
  }

  return removeCompileImport(result);
}

/**
 * Find the end position of a JavaScript expression starting at `start` using acorn.
 * Returns the end offset, or -1 if the expression cannot be parsed.
 */
export function findExpressionEnd(code: string, start: number): number {
  try {
    const node = parseExpressionAt(code, start, {
      ecmaVersion: "latest",
      sourceType: "module",
    });
    return node.end;
  } catch {
    return -1;
  }
}

/**
 * Rewrite source code by replacing plain Zod schema exports with IIFE-wrapped optimized validators.
 * Used by autoDiscover mode (no compile() wrappers needed).
 */
export function rewriteSourceAutoDiscover(
  code: string,
  schemas: CompiledSchemaInfo[],
  options?: { zodCompat?: boolean | undefined },
): string {
  let result = code;

  for (const schema of schemas) {
    const escapedName = schema.exportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match: export? (const|let|var) ExportName[: TypeAnnotation] = <expr>
    const assignPattern = new RegExp(
      `((?:export\\s+)?(?:const|let|var)\\s+${escapedName}(?:\\s*:[^=]*)?\\s*=\\s*)`,
    );
    const match = assignPattern.exec(result);
    if (!match) continue;

    const rhsStart = match.index + match[0].length;
    const rhsEnd = findExpressionEnd(result, rhsStart);
    if (rhsEnd === -1) continue;

    const originalExpr = result.slice(rhsStart, rhsEnd).trim();
    const prefix = match[1] ?? "";
    const iife = generateIIFE(originalExpr, schema, options);
    result = result.slice(0, match.index) + prefix + iife + result.slice(rhsEnd);
  }

  return result;
}

/**
 * Remove the `compile` binding from `import { compile, ... } from "zod-aot"` statements.
 * If `compile` is the only import, the entire import line is removed.
 */
export function removeCompileImport(code: string): string {
  // Match: import { ... } from "zod-aot" or 'zod-aot'
  const importPattern = /import\s*\{([^}]*)\}\s*from\s*["']zod-aot["'];?/g;

  return code.replace(importPattern, (_match, imports: string) => {
    const names = imports
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const remaining = names.filter((n) => n !== "compile");
    if (remaining.length === 0) return "";
    return `import { ${remaining.join(", ")} } from "zod-aot";`;
  });
}
