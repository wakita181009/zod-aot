import type { SchemaIR } from "../../types.js";
import { makeFallback } from "../fallback.js";
import type { ExtractFn, FallbackEntry, ZodDef } from "../types.js";

export function extractCatch(
  def: ZodDef,
  zodSchema: unknown,
  p: string,
  fallbacks: FallbackEntry[] | undefined,
  recurse: ExtractFn,
  visiting?: Set<unknown>,
): SchemaIR {
  const inner = recurse(def.innerType, fallbacks, `${p}._zod.def.innerType`, visiting);
  if (inner.type === "fallback") return makeFallback("unsupported", zodSchema, fallbacks, p);

  let defaultValue: unknown;
  try {
    defaultValue = (def.catchValue as (ctx: unknown) => unknown)({
      error: { issues: [] },
      input: undefined,
    });
  } catch {
    return makeFallback("unsupported", zodSchema, fallbacks, p);
  }

  if (defaultValue instanceof Date) return makeFallback("unsupported", zodSchema, fallbacks, p);
  if (defaultValue !== undefined) {
    try {
      JSON.stringify(defaultValue);
    } catch {
      return makeFallback("unsupported", zodSchema, fallbacks, p);
    }
  }

  return { type: "catch", inner, defaultValue };
}
