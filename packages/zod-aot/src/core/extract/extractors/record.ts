import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractRecord(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  if (!def.valueType) {
    return ctx.fallback("unsupported");
  }
  const keyType = ctx.visit(def.keyType, "._zod.def.keyType");
  const valueType = ctx.visit(def.valueType, "._zod.def.valueType");
  return { type: "record", keyType, valueType };
}
