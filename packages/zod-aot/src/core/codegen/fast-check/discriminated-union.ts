import type { DiscriminatedUnionIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckDiscriminatedUnion(
  ir: DiscriminatedUnionIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  // Generate checks for each branch, keyed by discriminator value
  const branchChecks: string[] = [];
  for (const option of ir.options) {
    const check = generateFn(option, x, ctx);
    if (check === null) return null;
    branchChecks.push(`(${check})`);
  }
  // Combine as || chain, wrapped for precedence safety
  return `(${branchChecks.join("||")})`;
}
