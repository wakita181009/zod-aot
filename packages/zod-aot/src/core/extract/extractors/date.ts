import type { DateCheckIR, SchemaIR } from "../../types.js";
import { unsupportedCheckReason } from "../checks.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractDate(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const dateChecks: DateCheckIR[] = [];
  if (def.checks) {
    for (const check of def.checks) {
      const checkDef = check._zod?.def;
      if (!checkDef) continue;
      if (checkDef.check === "greater_than") {
        const v = checkDef.value as unknown as string;
        const ts = new Date(v).getTime();
        if (Number.isNaN(ts)) return ctx.fallback("unsupported");
        dateChecks.push({
          kind: "date_greater_than",
          value: String(v),
          timestamp: ts,
          inclusive: checkDef.inclusive,
        });
      } else if (checkDef.check === "less_than") {
        const v = checkDef.value as unknown as string;
        const ts = new Date(v).getTime();
        if (Number.isNaN(ts)) return ctx.fallback("unsupported");
        dateChecks.push({
          kind: "date_less_than",
          value: String(v),
          timestamp: ts,
          inclusive: checkDef.inclusive,
        });
      } else {
        return ctx.fallback(unsupportedCheckReason(checkDef));
      }
    }
  }
  return { type: "date", checks: dateChecks, ...(def.coerce ? { coerce: true } : {}) };
}
