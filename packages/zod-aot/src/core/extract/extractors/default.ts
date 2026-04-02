import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractDefault(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const inner = ctx.visit(def.innerType, "._zod.def.innerType");
  const defaultValue = def.defaultValue;
  // Date objects serialize to strings via JSON.stringify, losing their type.
  // Fall back to Zod for Date defaults to preserve correct runtime behavior.
  if (defaultValue instanceof Date) {
    return ctx.fallback("unsupported");
  }
  try {
    JSON.stringify(defaultValue);
  } catch {
    return ctx.fallback("unsupported");
  }
  return { type: "default", inner, defaultValue };
}
