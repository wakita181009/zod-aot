import type { SchemaIR } from "../../types.js";
import { extractChecks } from "../checks.js";
import { makeFallback } from "../fallback.js";
import type { FallbackEntry, ZodDef } from "../types.js";

export function extractString(
  def: ZodDef,
  zodSchema: unknown,
  p: string,
  fallbacks: FallbackEntry[] | undefined,
): SchemaIR {
  const coerce = def.coerce ? { coerce: true as const } : {};
  // String format schemas (z.email(), z.url(), z.uuid())
  if (def.check === "string_format") {
    const pattern = def.pattern instanceof RegExp ? def.pattern.source : def.pattern;
    return {
      type: "string",
      checks: [{ kind: "string_format", format: def.format, ...(pattern ? { pattern } : {}) }],
      ...coerce,
    };
  }
  if (!def.checks || def.checks.length === 0) {
    return { type: "string", checks: [], ...coerce };
  }
  const { checkIRs, hasFallback } = extractChecks(def.checks);
  if (hasFallback) return makeFallback("refine", zodSchema, fallbacks, p);
  return { type: "string", checks: checkIRs, ...coerce };
}
