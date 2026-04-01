import type { CheckOrEffectIR } from "../types.js";
import { tryCompileEffect } from "./effects.js";
import type { ZodCheckSchema } from "./types.js";

export function extractChecks(checks: ZodCheckSchema[]): {
  checkIRs: CheckOrEffectIR[];
  hasFallback: boolean;
} {
  const checkIRs: CheckOrEffectIR[] = [];
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
        if (def.format === "includes" && typeof def.includes === "string") {
          checkIRs.push({
            kind: "includes",
            includes: def.includes,
            ...(typeof def.position === "number" ? { position: def.position } : {}),
          });
          break;
        }
        if (def.format === "starts_with" && typeof def.prefix === "string") {
          checkIRs.push({ kind: "starts_with", prefix: def.prefix });
          break;
        }
        if (def.format === "ends_with" && typeof def.suffix === "string") {
          checkIRs.push({ kind: "ends_with", suffix: def.suffix });
          break;
        }
        const pattern = def.pattern instanceof RegExp ? def.pattern.source : def.pattern;
        checkIRs.push({
          kind: "string_format",
          format: def.format,
          ...(pattern ? { pattern } : {}),
        });
        break;
      }
      case "custom": {
        const source = tryCompileEffect(def.fn);
        if (source) {
          const message =
            typeof def.error === "function" ? extractRefineMessage(def.error) : undefined;
          checkIRs.push({ kind: "refine_effect", source, ...(message ? { message } : {}) });
        } else {
          hasFallback = true;
        }
        break;
      }
    }
  }

  return { checkIRs, hasFallback };
}

function extractRefineMessage(errorFn: (...args: unknown[]) => unknown): string | undefined {
  try {
    const result = errorFn({});
    return typeof result === "string" ? result : undefined;
  } catch {
    return undefined;
  }
}
