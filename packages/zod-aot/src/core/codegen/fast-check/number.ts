import type { NumberIR } from "../../types.js";
import { checkPriority } from "../context.js";

export function fastCheckNumber(ir: NumberIR, x: string): string | null {
  const parts: string[] = [
    `typeof ${x}==="number"`,
    `!Number.isNaN(${x})`,
    `Number.isFinite(${x})`,
  ];

  for (const check of [...ir.checks].sort(checkPriority)) {
    switch (check.kind) {
      case "number_format":
        switch (check.format) {
          case "safeint":
            parts.push(`Number.isSafeInteger(${x})`);
            break;
          case "int32":
            parts.push(`(${x}|0)===${x}`);
            break;
          case "uint32":
            parts.push(`${x}>=0`, `${x}<=4294967295`, `(${x}>>>0)===${x}`);
            break;
          case "float32":
            parts.push(`Math.fround(${x})===${x}`);
            break;
          case "float64":
            // All finite numbers are valid float64
            break;
        }
        break;
      case "greater_than":
        parts.push(check.inclusive ? `${x}>=${check.value}` : `${x}>${check.value}`);
        break;
      case "less_than":
        parts.push(check.inclusive ? `${x}<=${check.value}` : `${x}<${check.value}`);
        break;
      case "multiple_of":
        parts.push(`${x}%${check.value}===0`);
        break;
      case "min_length":
      case "max_length":
      case "length_equals":
      case "string_format":
      case "includes":
      case "starts_with":
      case "ends_with":
        // String-only checks on a number schema — shouldn't happen, skip
        break;
    }
  }

  return parts.join("&&");
}
