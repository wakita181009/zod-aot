import type { DateCheckIR, SchemaIR } from "../../types.js";
import { type CheckFallbackReason, checkedExtractor, uncompiledCheckReason } from "../checks.js";
import type { ExtractorContext, ZodCheckDef, ZodDef } from "../types.js";

function mapDateCheck(def: ZodCheckDef): DateCheckIR | CheckFallbackReason {
  if (def.check !== "greater_than" && def.check !== "less_than") {
    return uncompiledCheckReason(def);
  }
  const value = def.value as unknown as string;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "unsupported";
  return {
    kind: def.check === "greater_than" ? "date_greater_than" : "date_less_than",
    value: String(value),
    timestamp,
    inclusive: def.inclusive,
  };
}

function extractDate(def: ZodDef, _ctx: ExtractorContext, checks: DateCheckIR[]): SchemaIR {
  return { type: "date", checks, ...(def.coerce ? { coerce: true } : {}) };
}

export const dateExtractor = checkedExtractor(mapDateCheck, extractDate);
