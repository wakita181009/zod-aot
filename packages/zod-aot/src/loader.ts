import path from "node:path";
import { pathToFileURL } from "node:url";

type Runtime = "node" | "bun" | "deno";

function detectRuntime(): Runtime {
  if ("Bun" in globalThis) return "bun";
  if ("Deno" in globalThis) return "deno";
  return "node";
}

async function importModule(absPath: string, suffix: string): Promise<Record<string, unknown>> {
  return (await import(pathToFileURL(absPath).href + suffix)) as Record<string, unknown>;
}

export interface LoadOptions {
  /** Append a cache-busting query parameter to bypass Node.js module cache (useful for HMR). */
  cacheBust?: boolean;
}

/**
 * Dynamically import a source file (.ts or .js).
 * - Bun/Deno: native TypeScript support, direct import
 * - Node.js 22+: native type stripping, direct import
 * - Node.js <22: uses tsx's register API for TypeScript files
 */
export async function loadSourceFile(
  filePath: string,
  options?: LoadOptions,
): Promise<Record<string, unknown>> {
  const absPath = path.resolve(filePath);
  const ext = path.extname(absPath);
  const runtime = detectRuntime();
  const suffix = options?.cacheBust ? `?t=${Date.now()}` : "";

  // Node.js < 22 needs tsx for TypeScript files.
  // Node.js 22+ has native type stripping; tsx's register hook causes
  // ERR_REQUIRE_CYCLE_MODULE due to stricter CJS/ESM interop cycle enforcement.
  const needsTsx =
    runtime === "node" &&
    (ext === ".ts" || ext === ".tsx" || ext === ".mts") &&
    parseInt(process.versions.node, 10) < 22;

  const unregister = needsTsx ? await registerTsx(absPath) : undefined;
  try {
    return await importModule(absPath, suffix);
  } finally {
    unregister?.();
  }
}

async function registerTsx(absPath: string): Promise<() => void> {
  let tsxModule: { register: () => () => void };
  try {
    const tsxSpecifier = "tsx/esm/api";
    tsxModule = (await import(tsxSpecifier)) as typeof tsxModule;
  } catch {
    throw new Error(
      `Cannot load TypeScript file without tsx.\n` +
        `Install it: npm install -D tsx\n` +
        `File: ${absPath}`,
    );
  }
  return tsxModule.register();
}
