import type { SchemaIR } from "../../types.js";
import { makeFallback } from "../fallback.js";
import type { ExtractFn, FallbackEntry, ZodSchema } from "../types.js";

export function extractLazy(
  schema: ZodSchema,
  zodSchema: unknown,
  p: string,
  fallbacks: FallbackEntry[] | undefined,
  recurse: ExtractFn,
  visiting?: Set<unknown>,
): SchemaIR {
  const innerSchema = schema._zod.innerType;
  if (!innerSchema) {
    return makeFallback("lazy", zodSchema, fallbacks, p);
  }
  // Cycle detection: if we've already visited this resolved schema, fall back
  if (visiting?.has(innerSchema)) {
    return makeFallback("lazy", zodSchema, fallbacks, p);
  }
  return recurse(innerSchema, fallbacks, `${p}._zod.innerType`, visiting);
}
