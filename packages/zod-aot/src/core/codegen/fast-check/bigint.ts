import type { BigIntIR } from "../../types.js";
import { checkPriority } from "../context.js";

export function fastCheckBigInt(ir: BigIntIR, x: string): string | null {
  const parts: string[] = [`typeof ${x}==="bigint"`];

  for (const check of [...ir.checks].sort(checkPriority)) {
    switch (check.kind) {
      case "bigint_greater_than":
        parts.push(check.inclusive ? `${x}>=${check.value}n` : `${x}>${check.value}n`);
        break;
      case "bigint_less_than":
        parts.push(check.inclusive ? `${x}<=${check.value}n` : `${x}<${check.value}n`);
        break;
      case "bigint_multiple_of":
        parts.push(`${x}%${check.value}n===0n`);
        break;
    }
  }

  return parts.join("&&");
}
