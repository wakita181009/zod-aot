import { hasMutation } from "../../codegen/context.js";
import type { SchemaIR, SetCheckIR } from "../../types.js";
import { unsupportedCheckReason } from "../checks.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractSet(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const valueType = ctx.visit(def.valueType, "._zod.def.valueType");
  // Set codegen validates elements in place and never rebuilds the set.
  if (hasMutation(valueType)) return ctx.fallback("unsupported");
  const setChecks: SetCheckIR[] = [];
  if (def.checks) {
    for (const check of def.checks) {
      const checkDef = check._zod?.def;
      if (!checkDef) continue;
      if (checkDef.check === "min_size") {
        setChecks.push({ kind: "min_size", minimum: checkDef.minimum });
      } else if (checkDef.check === "max_size") {
        setChecks.push({ kind: "max_size", maximum: checkDef.maximum });
      } else {
        return ctx.fallback(unsupportedCheckReason(checkDef));
      }
    }
  }
  return { type: "set", valueType, ...(setChecks.length > 0 ? { checks: setChecks } : {}) };
}
