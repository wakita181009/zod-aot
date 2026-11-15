import type { SchemaIR } from "../../types.js";
import { extractChecks, STRING_CHECK_KINDS } from "../checks.js";
import type { ExtractorContext, ZodCheckSchema, ZodDef } from "../types.js";

export function extractString(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const coerce = def.coerce ? { coerce: true as const } : {};
  // Format schemas (z.email(), z.url(), ...) carry their own format check on the
  // schema def and run it before any chained `def.checks`.
  const checks: ZodCheckSchema[] =
    def.check === "string_format"
      ? [ctx.schema as ZodCheckSchema, ...(def.checks ?? [])]
      : (def.checks ?? []);
  const { checkIRs, fallback } = extractChecks(checks, STRING_CHECK_KINDS);
  if (fallback) return ctx.fallback(fallback);
  return { type: "string", checks: checkIRs, ...coerce };
}
