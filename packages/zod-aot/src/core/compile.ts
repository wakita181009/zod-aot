import { createFallback } from "./runtime.js";
import type { CompiledSchema } from "./types.js";

const COMPILED_MARKER = Symbol.for("zod-aot:compiled");

/**
 * Compile a Zod schema into an optimized validator.
 *
 * At dev-time, falls back to Zod's runtime validation.
 * After `npx zod-aot generate`, import from the `.compiled.ts` file instead.
 */
export function compile<T>(zodSchema: unknown): CompiledSchema<T> {
  const result = createFallback<T>(zodSchema);
  Object.defineProperty(result, COMPILED_MARKER, { value: true, enumerable: false });
  return result;
}

/**
 * Check if a value is a CompiledSchema created by compile().
 * Used by the CLI to discover schemas in source files.
 */
export function isCompiledSchema(value: unknown): value is CompiledSchema<unknown> {
  return typeof value === "object" && value !== null && COMPILED_MARKER in value;
}
