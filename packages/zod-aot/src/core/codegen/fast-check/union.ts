import type { UnionIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckUnion(
  ir: UnionIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  const optionChecks: string[] = [];
  for (const option of ir.options) {
    const check = generateFn(option, x, ctx);
    if (check === null) return null;
    optionChecks.push(`(${check})`);
  }
  // Wrap in parens — || has lower precedence than && in parent expressions
  return `(${optionChecks.join("||")})`;
}
