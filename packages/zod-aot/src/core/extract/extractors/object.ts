import type { SchemaIR } from "../../types.js";
import { extractChecks, OBJECT_CHECK_KINDS } from "../checks.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractObject(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  const properties: Record<string, SchemaIR> = {};
  for (const [key, value] of Object.entries(def.shape)) {
    properties[key] = ctx.visit(value, `.shape[${JSON.stringify(key)}]`);
  }
  if (def.checks && def.checks.length > 0) {
    const { checkIRs, fallback } = extractChecks(def.checks, OBJECT_CHECK_KINDS);
    if (fallback) return ctx.fallback(fallback);
    const refineChecks = checkIRs.filter((c) => c.kind === "refine_effect");
    if (refineChecks.length > 0) {
      return { type: "object", properties, checks: refineChecks };
    }
  }
  return { type: "object", properties };
}
