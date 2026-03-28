import type { PipeIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckPipe(
  ir: PipeIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  // Only eligible if `out` is the same as `in` (non-transform pipe)
  // We check `in` only — if the pipe has a transform, `out` would be a fallback
  const inCheck = generateFn(ir.in, x, ctx);
  if (inCheck === null) return null;
  // Check if out schema is eligible (non-fallback)
  const outCheck = generateFn(ir.out, x, ctx);
  if (outCheck === null) return null;
  // Both in and out must pass
  return inCheck === "true" ? outCheck : outCheck === "true" ? inCheck : `${inCheck}&&${outCheck}`;
}
