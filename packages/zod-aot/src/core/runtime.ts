import type { CompiledSchema } from "./types.js";

interface ZodLikeSchema {
  safeParse(input: unknown): { success: boolean; data?: unknown; error?: unknown };
}

/**
 * Dev-time fallback: wraps Zod schema via Object.create to provide the CompiledSchema interface
 * while preserving full Zod compatibility (e.g. `_zod`, `shape`, `safeParseAsync`).
 *
 * parse/safeParse/parseAsync/safeParseAsync fall through to the original Zod schema via prototype.
 * Only `schema` is added as an own property.
 */
export function createFallback<T>(zodSchema: unknown): CompiledSchema<T> {
  const schema = zodSchema as ZodLikeSchema & object;

  const facade = Object.create(schema) as CompiledSchema<T>;
  facade.schema = zodSchema;
  return facade;
}
