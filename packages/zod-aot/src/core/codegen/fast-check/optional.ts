import type { OptionalIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckOptional(
  ir: OptionalIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  const inner = generateFn(ir.inner, x, ctx);
  if (inner === null) return null;
  return `(${x}===undefined||(${inner}))`;
}
