import type { CompiledSchema } from "./types.js";

interface ZodLikeSchema {
  safeParse(input: unknown): { success: boolean; data?: unknown; error?: unknown };
}

/**
 * Dev-time fallback: wraps Zod schema via Object.create to provide the CompiledSchema interface
 * while preserving full Zod compatibility (e.g. `_zod`, `shape`, `safeParseAsync`).
 *
 * parse/safeParse/parseAsync/safeParseAsync fall through to the original Zod schema via prototype.
 * Only `is` and `schema` are added as own properties.
 */
export function createFallback<T>(zodSchema: unknown): CompiledSchema<T> {
  const schema = zodSchema as ZodLikeSchema & object;

  const wrapped = Object.create(schema) as CompiledSchema<T>;

  wrapped.is = (input: unknown): input is T => schema.safeParse(input).success;

  wrapped.schema = zodSchema;

  return wrapped;
}
