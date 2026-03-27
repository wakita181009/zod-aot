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
 * - Node.js: uses jiti for reliable TypeScript transpilation
 *   (handles extensionless imports, enums, and all TS syntax)
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

  const { createJiti } = await import("jiti");
  const jiti = createJiti(pathToFileURL(absPath).href, {
    moduleCache: !options?.cacheBust,
  });
  return (await jiti.import(absPath)) as Record<string, unknown>;
}
