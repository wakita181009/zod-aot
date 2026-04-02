import type { CheckNumberFormat, SchemaIR } from "../../types.js";
import { extractChecks } from "../checks.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractNumber(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const coerce = def.coerce ? { coerce: true as const } : {};
  if (def.check === "number_format" && def.format) {
    return {
      type: "number",
      checks: [{ kind: "number_format", format: def.format as CheckNumberFormat["format"] }],
      ...coerce,
    };
  }
  if (!def.checks || def.checks.length === 0) {
    return { type: "number", checks: [], ...coerce };
  }
  const { checkIRs, hasFallback } = extractChecks(def.checks);
  if (hasFallback) return ctx.fallback("refine");
  return { type: "number", checks: checkIRs, ...coerce };
}
