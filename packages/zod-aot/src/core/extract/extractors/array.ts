import type { ArrayCheckIR, SchemaIR } from "../../types.js";
import {
  type CheckFallbackReason,
  checkedExtractor,
  mapLengthCheck,
  mapRefineCheck,
} from "../checks.js";
import type { ExtractorContext, ZodCheckDef, ZodDef } from "../types.js";

function mapArrayCheck(def: ZodCheckDef): ArrayCheckIR | CheckFallbackReason {
  if (def.check === "custom") return mapRefineCheck(def);
  return mapLengthCheck(def) ?? "unsupported";
}

function extractArray(def: ZodDef, ctx: ExtractorContext, checks: ArrayCheckIR[]): SchemaIR {
  const element = ctx.visit(def.element, "._zod.def.element");
  return { type: "array", element, checks };
}

export const arrayExtractor = checkedExtractor(mapArrayCheck, extractArray);
