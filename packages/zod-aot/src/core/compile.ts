import type { output, ZodType } from "zod";
import { createFallback } from "./runtime.js";
import type { CompiledSchema } from "./types.js";

const COMPILED_MARKER = Symbol.for("zod-aot:compiled");

/**
 * Compile a Zod schema into an optimized validator.
 *
 * At dev-time, falls back to Zod's runtime validation via Object.create,
 * preserving full Zod compatibility (e.g. `_zod`, `shape`, `safeParseAsync`).
 * After `npx zod-aot generate`, import from the `.compiled.ts` file instead.
 *
 * The return type is `T & CompiledSchema<output<T>>`, preserving the original
 * Zod schema type for compatibility with libraries like `@hono/zod-validator`.
 */
export function compile<T extends ZodType>(zodSchema: T): T & CompiledSchema<output<T>> {
  const result = createFallback<output<T>>(zodSchema);
  Object.defineProperty(result, COMPILED_MARKER, { value: true, enumerable: false });
  return result as T & CompiledSchema<output<T>>;
}

/**
 * Check if a value is a CompiledSchema created by compile().
 * Used by the CLI to discover schemas in source files.
 */
export function isCompiledSchema(value: unknown): value is CompiledSchema<unknown> {
  return typeof value === "object" && value !== null && COMPILED_MARKER in value;
}
