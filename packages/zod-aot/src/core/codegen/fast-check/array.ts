import type { ArrayIR, CheckIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";
import { checkPriority } from "../context.js";

export function fastCheckArray(
  ir: ArrayIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  if (ir.checks.some((c) => c.kind === "refine_effect")) return null;

  const parts: string[] = [`Array.isArray(${x})`];
  const checks = ir.checks.filter((c): c is CheckIR => c.kind !== "refine_effect");

  // Size checks
  for (const check of checks.sort(checkPriority)) {
    switch (check.kind) {
      case "min_length":
        parts.push(`${x}.length>=${check.minimum}`);
        break;
      case "max_length":
        parts.push(`${x}.length<=${check.maximum}`);
        break;
      case "length_equals":
        parts.push(`${x}.length===${check.length}`);
        break;
    }
  }

  // Element validation via .every()
  const elemVar = `__fe_${ctx.counter++}`;
  const elemCheck = generateFn(ir.element, elemVar, ctx);
  if (elemCheck === null) return null;
  if (elemCheck !== "true") {
    parts.push(`${x}.every(${elemVar}=>${elemCheck})`);
  }

  return parts.join("&&");
}
