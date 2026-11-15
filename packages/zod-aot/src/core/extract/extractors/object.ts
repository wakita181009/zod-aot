import type { RefineEffectCheckIR, SchemaIR } from "../../types.js";
import { checkedExtractor, mapRefineCheck } from "../checks.js";
import type { ExtractorContext, ZodDef } from "../types.js";

function extractObject(
  def: ZodDef,
  ctx: ExtractorContext,
  checks: RefineEffectCheckIR[],
): SchemaIR {
  const properties: Record<string, SchemaIR> = {};
  for (const [key, value] of Object.entries(def.shape)) {
    properties[key] = ctx.visit(value, `.shape[${JSON.stringify(key)}]`);
  }
  return { type: "object", properties, ...(checks.length > 0 ? { checks } : {}) };
}

/** Objects support only `.refine()`; any other check falls back. */
export const objectExtractor = checkedExtractor(mapRefineCheck, extractObject);
