import path from "node:path";
import { pathToFileURL } from "node:url";

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

/**
 * Dynamically import a source file (.ts or .js).
 * - Bun/Deno: native TypeScript support, direct import
 * - Node.js: uses tsx's register API for TypeScript files
 */
export async function loadSourceFile(
  filePath: string,
  options?: LoadOptions,
): Promise<Record<string, unknown>> {
  const absPath = path.resolve(filePath);
  const ext = path.extname(absPath);
  const runtime = detectRuntime();
  const suffix = options?.cacheBust ? `?t=${Date.now()}` : "";

  // Bun and Deno can import TypeScript natively
  if (runtime === "bun" || runtime === "deno") {
    return (await import(pathToFileURL(absPath).href + suffix)) as Record<string, unknown>;
  }

  // Node.js: TypeScript files need tsx
  if (ext === ".ts" || ext === ".tsx" || ext === ".mts") {
    return loadTypeScriptFileWithTsx(absPath, suffix);
  }

  // Node.js: .js / .mjs — direct import
  return (await import(pathToFileURL(absPath).href + suffix)) as Record<string, unknown>;
}

async function loadTypeScriptFileWithTsx(
  absPath: string,
  suffix = "",
): Promise<Record<string, unknown>> {
  // Node.js 24+ has native type stripping enabled by default.
  // tsx's register hook causes ERR_REQUIRE_CYCLE_MODULE on Node 24+
  // due to stricter CJS/ESM interop cycle enforcement.
  if (parseInt(process.versions.node, 10) >= 24) {
    return (await import(pathToFileURL(absPath).href + suffix)) as Record<string, unknown>;
  }

  let tsxModule: { register: () => () => void };
  try {
    // Dynamic import — tsx may or may not be installed
    // Use variable to prevent TypeScript from resolving the module statically
    const tsxSpecifier = "tsx/esm/api";
    tsxModule = (await import(tsxSpecifier)) as typeof tsxModule;
  } catch {
    throw new Error(
      `Cannot load TypeScript file without tsx.\n` +
        `Install it: npm install -D tsx\n` +
        `File: ${absPath}`,
    );
  }

  const unregister = tsxModule.register();
  try {
    return (await import(pathToFileURL(absPath).href + suffix)) as Record<string, unknown>;
  } finally {
    unregister();
  }
}
