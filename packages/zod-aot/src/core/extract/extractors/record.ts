import { hasMutation } from "../../codegen/context.js";
import type { SchemaIR } from "../../types.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractRecord(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  if (!def.valueType) {
    return ctx.fallback("unsupported");
  }
  const keyType = ctx.visit(def.keyType, "._zod.def.keyType");
  const valueType = ctx.visit(def.valueType, "._zod.def.valueType");
  // Record codegen reads values by the original key and keeps original keys in
  // the output, so a key schema that rewrites its value cannot be compiled.
  if (hasMutation(keyType)) return ctx.fallback("unsupported");
  return { type: "record", keyType, valueType };
}
