import type { NullableIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckNullable(
  ir: NullableIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  const inner = generateFn(ir.inner, x, ctx);
  if (inner === null) return null;
  return `(${x}===null||(${inner}))`;
}
