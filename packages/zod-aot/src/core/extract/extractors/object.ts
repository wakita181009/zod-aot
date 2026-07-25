import type { SchemaIR } from "../../types.js";
import { extractChecks } from "../checks.js";
import type { ExtractorContext, ZodDef } from "../types.js";

export function extractObject(def: ZodDef, ctx: ExtractorContext): SchemaIR {
  // Strict, loose/passthrough, and catchall objects all expose `catchall`.
  // Preserve their semantics through the native fallback until codegen models
  // each unknown-key policy explicitly.
  if (def.catchall) return ctx.fallback("unsupported");

  const properties: Record<string, SchemaIR> = {};
  for (const [key, value] of Object.entries(def.shape)) {
    properties[key] = ctx.visit(value, `.shape[${JSON.stringify(key)}]`);
  }
  if (def.checks && def.checks.length > 0) {
    const { checkIRs, hasFallback } = extractChecks(def.checks);
    if (hasFallback) return ctx.fallback("refine");
    const refineChecks = checkIRs.filter((c) => c.kind === "refine_effect");
    if (refineChecks.length > 0) {
      return { type: "object", properties, unknownKeys: "strip", checks: refineChecks };
    }
  }
  return { type: "object", properties, unknownKeys: "strip" };
}
