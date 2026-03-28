import type { ReadonlyIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckReadonly(
  ir: ReadonlyIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  return generateFn(ir.inner, x, ctx);
}
