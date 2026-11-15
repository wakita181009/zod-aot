import { hasMutation } from "../../codegen/context.js";
import type { SchemaIR, SetCheckIR } from "../../types.js";
import {
  type CheckFallbackReason,
  checkedExtractor,
  mapSizeCheck,
  uncompiledCheckReason,
} from "../checks.js";
import type { ExtractorContext, ZodCheckDef, ZodDef } from "../types.js";

function mapSetCheck(def: ZodCheckDef): SetCheckIR | CheckFallbackReason {
  return mapSizeCheck(def) ?? uncompiledCheckReason(def);
}

function extractSet(def: ZodDef, ctx: ExtractorContext, checks: SetCheckIR[]): SchemaIR {
  const valueType = ctx.visit(def.valueType, "._zod.def.valueType");
  // Set codegen validates elements in place and never rebuilds the set.
  if (hasMutation(valueType)) return ctx.fallback("unsupported");
  return { type: "set", valueType, ...(checks.length > 0 ? { checks } : {}) };
}

export const setExtractor = checkedExtractor(mapSetCheck, extractSet);
