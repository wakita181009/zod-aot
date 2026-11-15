import type { BigIntCheckIR, SchemaIR } from "../../types.js";
import { type CheckFallbackReason, checkedExtractor, uncompiledCheckReason } from "../checks.js";
import type { ExtractorContext, ZodCheckDef, ZodDef } from "../types.js";

function mapBigintCheck(def: ZodCheckDef): BigIntCheckIR | CheckFallbackReason {
  switch (def.check) {
    case "greater_than":
      return { kind: "bigint_greater_than", value: String(def.value), inclusive: def.inclusive };
    case "less_than":
      return { kind: "bigint_less_than", value: String(def.value), inclusive: def.inclusive };
    case "multiple_of":
      return { kind: "bigint_multiple_of", value: String(def.value) };
    default:
      return uncompiledCheckReason(def);
  }
}

function extractBigint(def: ZodDef, _ctx: ExtractorContext, checks: BigIntCheckIR[]): SchemaIR {
  return { type: "bigint", checks, ...(def.coerce ? { coerce: true } : {}) };
}

export const bigintExtractor = checkedExtractor(mapBigintCheck, extractBigint);
