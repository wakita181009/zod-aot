import type { CheckNumberFormat, NumberCheckIR, SchemaIR } from "../../types.js";
import { type CheckFallbackReason, checkedExtractor, mapRefineCheck } from "../checks.js";
import type { ExtractorContext, ZodCheckDef, ZodCheckSchema, ZodDef } from "../types.js";

function mapNumberCheck(
  def: ZodCheckDef,
  check: ZodCheckSchema,
): NumberCheckIR | CheckFallbackReason {
  switch (def.check) {
    case "greater_than":
      return { kind: "greater_than", value: def.value, inclusive: def.inclusive };
    case "less_than":
      return { kind: "less_than", value: def.value, inclusive: def.inclusive };
    case "multiple_of":
      // Zod's remainder for fractional steps is float-tolerant and its algorithm
      // differs across versions (toFixed-based before 4.6, ratio-based since), so
      // only integer steps — where both agree with `%` — are compiled.
      if (!Number.isInteger(def.value)) return "unsupported";
      return { kind: "multiple_of", value: def.value };
    case "number_format": {
      const format = def.format as CheckNumberFormat["format"];
      return {
        kind: "number_format",
        format,
        ...(isLegacyNumberFormat(check, format) ? { legacy: true as const } : {}),
      };
    }
    case "custom":
      return mapRefineCheck(def);
    default:
      return "unsupported";
  }
}

/** Out-of-range probe values that hit the issue shapes that changed in Zod 4.3. */
const LEGACY_PROBES: Partial<Record<CheckNumberFormat["format"], number>> = {
  safeint: 2 ** 60, // unsafe-integer too_big: `inclusive` added in 4.3
  int32: 2 ** 40, // range too_big: `inclusive` and `continue` added in 4.3
  uint32: 2 ** 40,
  float32: 1e39,
};

/**
 * Detect the pre-4.3 number format issue shape by running the live check: core
 * never imports zod, so the installed version is only observable this way.
 */
function isLegacyNumberFormat(check: ZodCheckSchema, format: CheckNumberFormat["format"]): boolean {
  const probe = LEGACY_PROBES[format];
  const run = check._zod?.check;
  if (probe === undefined || typeof run !== "function") return false;
  const payload: { value: unknown; issues: Record<string, unknown>[] } = {
    value: probe,
    issues: [],
  };
  try {
    run(payload);
  } catch {
    return false;
  }
  const issue = payload.issues[0];
  return issue !== undefined && (issue["inclusive"] !== true || issue["continue"] !== true);
}

function extractNumber(def: ZodDef, _ctx: ExtractorContext, checks: NumberCheckIR[]): SchemaIR {
  return { type: "number", checks, ...(def.coerce ? { coerce: true as const } : {}) };
}

export const numberExtractor = checkedExtractor(mapNumberCheck, extractNumber);
