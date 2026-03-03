import type { CompiledSchema } from "./types.js";

/**
 * Dev-time fallback: wraps Zod schema to provide the CompiledSchema interface.
 */
export function createFallback<T>(_zodSchema: unknown): CompiledSchema<T> {
  throw new Error("Not implemented");
}
