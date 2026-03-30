import path from "node:path";
import { pathToFileURL } from "node:url";
import { getTsconfig } from "get-tsconfig";

type Runtime = "node" | "bun" | "deno";

function detectRuntime(): Runtime {
  if ("Bun" in globalThis) return "bun";
  if ("Deno" in globalThis) return "deno";
  return "node";
}

export interface LoadOptions {
  /** Append a cache-busting query parameter to bypass Node.js module cache (useful for HMR). */
  cacheBust?: boolean;
}

/** Cache: tsconfig.json absolute path → resolved jiti alias map */
const aliasCache = new Map<string, Record<string, string>>();

/**
 * Resolve tsconfig.json path aliases into the format jiti expects.
 * Returns an empty object if no tsconfig.json is found or no paths are configured.
 *
 * tsconfig paths use wildcards: { "@/*": ["./src/*"] }
 * jiti uses prefix matching:   { "@": "/absolute/path/to/src" }
 *
 * The trailing "/*" is stripped from both key and value before passing to jiti.
 */
function resolveTsconfigAliases(fromDir: string): Record<string, string> {
  const tsconfig = getTsconfig(fromDir);
  if (!tsconfig) return {};

  const cached = aliasCache.get(tsconfig.path);
  if (cached) return cached;

  const paths = tsconfig.config.compilerOptions?.paths;
  if (!paths || Object.keys(paths).length === 0) {
    const empty: Record<string, string> = {};
    aliasCache.set(tsconfig.path, empty);
    return empty;
  }

  const tsconfigDir = path.dirname(tsconfig.path);
  const baseUrl = tsconfig.config.compilerOptions?.baseUrl;
  const baseDir = baseUrl ? path.resolve(tsconfigDir, baseUrl) : tsconfigDir;

  const alias: Record<string, string> = {};
  for (const [pattern, targets] of Object.entries(paths)) {
    if (!targets || targets.length === 0) continue;
    const target = targets[0];
    if (!target) continue;
    // Strip trailing "/*" — jiti uses prefix matching, not glob wildcards
    const key = pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern;
    const val = target.endsWith("/*") ? target.slice(0, -2) : target;
    alias[key] = path.resolve(baseDir, val);
  }

  aliasCache.set(tsconfig.path, alias);
  return alias;
}

/**
 * Dynamically import a source file (.ts or .js).
 * - Bun/Deno: native TypeScript support, direct import
 * - Node.js: uses jiti for reliable TypeScript transpilation
 *   (handles extensionless imports, enums, path aliases, and all TS syntax)
 */
export async function loadSourceFile(
  filePath: string,
  options?: LoadOptions,
): Promise<Record<string, unknown>> {
  const absPath = path.resolve(filePath);
  const runtime = detectRuntime();
  const suffix = options?.cacheBust ? `?t=${Date.now()}` : "";

  // Bun and Deno handle TypeScript natively
  if (runtime === "bun" || runtime === "deno") {
    return (await import(pathToFileURL(absPath).href + suffix)) as Record<string, unknown>;
  }

  const alias = resolveTsconfigAliases(path.dirname(absPath));

  const { createJiti } = await import("jiti");
  const jiti = createJiti(pathToFileURL(absPath).href, {
    moduleCache: !options?.cacheBust,
    alias,
    jsx: true,
  });
  return (await jiti.import(absPath)) as Record<string, unknown>;
}
