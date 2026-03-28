import type { IntersectionIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckIntersection(
  ir: IntersectionIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  const left = generateFn(ir.left, x, ctx);
  if (left === null) return null;
  const right = generateFn(ir.right, x, ctx);
  if (right === null) return null;
  return left === "true" ? right : right === "true" ? left : `${left}&&${right}`;
}
