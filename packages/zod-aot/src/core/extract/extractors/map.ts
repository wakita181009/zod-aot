import { hasMutation } from "../../codegen/context.js";
import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractMap(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const keyType = ctx.visit(def.keyType, "._zod.def.keyType");
  const valueType = ctx.visit(def.valueType, "._zod.def.valueType");
  // Map codegen validates entries in place and never rebuilds the map.
  if (hasMutation(keyType) || hasMutation(valueType)) return ctx.fallback("unsupported");
  return { type: "map", keyType, valueType };
}
