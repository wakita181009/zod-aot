import type { BigIntCheckIR, SchemaIR } from "../../types.js";
import { unsupportedCheckReason } from "../checks.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractBigint(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const bigintChecks: BigIntCheckIR[] = [];
  if (def.checks) {
    for (const check of def.checks) {
      const checkDef = check._zod?.def;
      if (!checkDef) continue;
      switch (checkDef.check) {
        case "greater_than":
          bigintChecks.push({
            kind: "bigint_greater_than",
            value: String(checkDef.value),
            inclusive: checkDef.inclusive,
          });
          break;
        case "less_than":
          bigintChecks.push({
            kind: "bigint_less_than",
            value: String(checkDef.value),
            inclusive: checkDef.inclusive,
          });
          break;
        case "multiple_of":
          bigintChecks.push({
            kind: "bigint_multiple_of",
            value: String(checkDef.value),
          });
          break;
        default:
          return ctx.fallback(unsupportedCheckReason(checkDef));
      }
    }
  }
  return { type: "bigint", checks: bigintChecks, ...(def.coerce ? { coerce: true } : {}) };
}
