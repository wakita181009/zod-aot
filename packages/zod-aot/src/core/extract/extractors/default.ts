import type { SchemaIR } from "../../types.js";
import { makeFallback } from "../fallback.js";
import type { ExtractFn, FallbackEntry, ZodDef } from "../types.js";

export function extractDefault(
  def: ZodDef,
  zodSchema: unknown,
  p: string,
  fallbacks: FallbackEntry[] | undefined,
  recurse: ExtractFn,
  visiting?: Set<unknown>,
): SchemaIR {
  const inner = recurse(def.innerType, fallbacks, `${p}._zod.def.innerType`, visiting);
  const defaultValue = def.defaultValue;
  // Date objects serialize to strings via JSON.stringify, losing their type.
  // Fall back to Zod for Date defaults to preserve correct runtime behavior.
  if (defaultValue instanceof Date) {
    return makeFallback("unsupported", zodSchema, fallbacks, p);
  }
  try {
    JSON.stringify(defaultValue);
  } catch {
    return makeFallback("unsupported", zodSchema, fallbacks, p);
  }
  return { type: "default", inner, defaultValue };
}
