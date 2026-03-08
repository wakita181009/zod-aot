import type { SchemaIR } from "../../types.js";
import { extractChecks } from "../checks.js";
import { makeFallback } from "../fallback.js";
import type { FallbackEntry, ZodDef } from "../types.js";

export function extractNumber(
  def: ZodDef,
  zodSchema: unknown,
  p: string,
  fallbacks: FallbackEntry[] | undefined,
): SchemaIR {
  if (!def.checks || def.checks.length === 0) {
    return { type: "number", checks: [] };
  }
  const { checkIRs, hasFallback } = extractChecks(def.checks);
  if (hasFallback) return makeFallback("refine", zodSchema, fallbacks, p);
  return { type: "number", checks: checkIRs };
}
