import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractCatch(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const inner = ctx.visit(def.innerType, "._zod.def.innerType");
  if (inner.type === "fallback") return ctx.fallback("unsupported");

  let defaultValue: unknown;
  try {
    defaultValue = (def.catchValue as (ctx: unknown) => unknown)({
      error: { issues: [] },
      input: undefined,
    });
  } catch {
    return ctx.fallback("unsupported");
  }

  if (defaultValue instanceof Date) return ctx.fallback("unsupported");
  if (defaultValue !== undefined) {
    try {
      JSON.stringify(defaultValue);
    } catch {
      return ctx.fallback("unsupported");
    }
  }

  return { type: "catch", inner, defaultValue };
}
