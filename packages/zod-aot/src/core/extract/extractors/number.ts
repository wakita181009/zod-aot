import type { SchemaIR } from "../../types.js";
import { extractChecks, NUMBER_CHECK_KINDS } from "../checks.js";
import type { ExtractorContext, ZodCheckSchema, ZodDef } from "../types.js";

export function extractNumber(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const coerce = def.coerce ? { coerce: true as const } : {};
  // z.int() / z.float32() etc. carry their format check on the schema def and
  // run it before any chained `def.checks`.
  const checks: ZodCheckSchema[] =
    def.check === "number_format"
      ? [ctx.schema as ZodCheckSchema, ...(def.checks ?? [])]
      : (def.checks ?? []);
  const { checkIRs, fallback } = extractChecks(checks, NUMBER_CHECK_KINDS);
  if (fallback) return ctx.fallback(fallback);
  return { type: "number", checks: checkIRs, ...coerce };
}
