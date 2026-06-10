import path from "node:path";
import { pathToFileURL } from "node:url";
import { createPathsMatcher, getTsconfig } from "get-tsconfig";

type Runtime = "node" | "bun" | "deno";

function detectRuntime(): Runtime {
  if ("Bun" in globalThis) return "bun";
  if ("Deno" in globalThis) return "deno";
  return "node";
}

export interface LoadOptions {
  /** Append a cache-busting query parameter to bypass Node.js module cache (useful for HMR). */
  cacheBust?: boolean | undefined;
}

/** Cache: tsconfig.json absolute path → resolved jiti alias map */
const aliasCache = new Map<string, Record<string, string>>();

/**
 * Wildcard probe segment used to recover a base directory from
 * createPathsMatcher, which only resolves full specifiers.
 */
const WILDCARD_PROBE = "__zod_aot_probe__";

/**
 * Resolve tsconfig.json path aliases into the format jiti expects.
 * Returns an empty object if no tsconfig.json is found or no paths are configured.
 *
 * tsconfig paths use wildcards: { "@/*": ["./src/*"] }
 * jiti uses prefix matching:   { "@": "/absolute/path/to/src" }
 *
 * Resolution is delegated to get-tsconfig's createPathsMatcher, which
 * implements the TypeScript spec — in particular, relative `paths` entries
 * inherited via `extends` resolve against the tsconfig that declares them,
 * not the extending one. Resolving them manually against the found tsconfig's
 * directory breaks monorepos that keep `paths` in a shared root config.
 */
function resolveTsconfigAliases(fromDir: string): Record<string, string> {
  const tsconfig = getTsconfig(fromDir);
  if (!tsconfig) return {};

  const cached = aliasCache.get(tsconfig.path);
  if (cached) return cached;

  const alias: Record<string, string> = {};
  const paths = tsconfig.config.compilerOptions?.paths;
  const matcher = createPathsMatcher(tsconfig);

  if (paths && matcher) {
    for (const pattern of Object.keys(paths)) {
      if (pattern.endsWith("/*")) {
        // Resolve a probe specifier through the matcher, then strip the
        // probe segment to get the wildcard's base directory.
        const key = pattern.slice(0, -2);
        const resolved = matcher(`${key}/${WILDCARD_PROBE}`)[0];
        const probeSuffix =
          resolved?.endsWith(`/${WILDCARD_PROBE}`) || resolved?.endsWith(`\\${WILDCARD_PROBE}`);
        if (resolved && probeSuffix) {
          alias[key] = resolved.slice(0, -(WILDCARD_PROBE.length + 1));
        }
      } else {
        const resolved = matcher(pattern)[0];
        if (resolved) alias[pattern] = resolved;
      }
    }
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
