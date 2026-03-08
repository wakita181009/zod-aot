import type { CheckIR } from "../types.js";
import type { ZodCheckSchema } from "./types.js";

export function extractChecks(checks: ZodCheckSchema[]): {
  checkIRs: CheckIR[];
  hasFallback: boolean;
} {
  const checkIRs: CheckIR[] = [];
  let hasFallback = false;

  for (const check of checks) {
    const def = check._zod?.def;
    if (!def) continue;

    switch (def.check) {
      case "min_length":
        checkIRs.push({ kind: "min_length", minimum: def.minimum });
        break;
      case "max_length":
        checkIRs.push({ kind: "max_length", maximum: def.maximum });
        break;
      case "length_equals":
        checkIRs.push({ kind: "length_equals", length: def.length });
        break;
      case "greater_than":
        checkIRs.push({ kind: "greater_than", value: def.value, inclusive: def.inclusive });
        break;
      case "less_than":
        checkIRs.push({ kind: "less_than", value: def.value, inclusive: def.inclusive });
        break;
      case "multiple_of":
        checkIRs.push({ kind: "multiple_of", value: def.value });
        break;
      case "number_format":
        checkIRs.push({
          kind: "number_format",
          format: def.format as "safeint" | "int32" | "uint32" | "float32" | "float64",
        });
        break;
      case "string_format": {
        const pattern = def.pattern instanceof RegExp ? def.pattern.source : def.pattern;
        checkIRs.push({
          kind: "string_format",
          format: def.format,
          ...(pattern ? { pattern } : {}),
        });
        break;
      }
      case "custom":
        hasFallback = true;
        break;
    }
  }

  return { checkIRs, hasFallback };
}
