import type { TupleIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckTuple(
  ir: TupleIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  const parts: string[] = [`Array.isArray(${x})`];

  if (ir.rest === null) {
    parts.push(`${x}.length===${ir.items.length}`);
  } else {
    parts.push(`${x}.length>=${ir.items.length}`);
  }

  // Per-index checks
  for (let i = 0; i < ir.items.length; i++) {
    const itemIR = ir.items[i];
    if (!itemIR) continue;
    const itemCheck = generateFn(itemIR, `${x}[${i}]`, ctx);
    if (itemCheck === null) return null;
    if (itemCheck !== "true") parts.push(itemCheck);
  }

  // Rest element
  if (ir.rest !== null) {
    const rv = `__tr_${ctx.counter++}`;
    const restCheck = generateFn(ir.rest, rv, ctx);
    if (restCheck === null) return null;
    if (restCheck !== "true") {
      parts.push(`${x}.slice(${ir.items.length}).every(${rv}=>${restCheck})`);
    }
  }

  return parts.join("&&");
}
