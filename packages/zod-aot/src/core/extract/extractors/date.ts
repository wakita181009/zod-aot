import type { DateCheckIR, SchemaIR } from "../../types.js";
import type { ZodDef } from "../types.js";

export function extractDate(def: ZodDef): SchemaIR {
  const dateChecks: DateCheckIR[] = [];
  if (def.checks) {
    for (const check of def.checks) {
      const checkDef = check._zod?.def;
      if (!checkDef) continue;
      if (checkDef.check === "greater_than") {
        const v = checkDef.value as unknown as string;
        const ts = new Date(v).getTime();
        if (Number.isNaN(ts)) continue;
        dateChecks.push({
          kind: "date_greater_than",
          value: String(v),
          timestamp: ts,
          inclusive: checkDef.inclusive,
        });
      } else if (checkDef.check === "less_than") {
        const v = checkDef.value as unknown as string;
        const ts = new Date(v).getTime();
        if (Number.isNaN(ts)) continue;
        dateChecks.push({
          kind: "date_less_than",
          value: String(v),
          timestamp: ts,
          inclusive: checkDef.inclusive,
        });
      }
    }
  }
  return { type: "date", checks: dateChecks };
}
