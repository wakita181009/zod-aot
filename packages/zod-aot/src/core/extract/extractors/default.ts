import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractDefault(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const inner = ctx.visit(def.innerType, "._zod.def.innerType");
  if (ctx.fallbacks) {
    const fallbackIndex = ctx.fallbacks.length;
    ctx.fallbacks.push({ schema: ctx.schema, accessPath: ctx.path });
    return { type: "default", inner, fallbackIndex };
  }

  // No fallback tracking (unit tests) — use snapshot.
  const defaultValue = def.defaultValue;
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
