import type { RecordIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";

export function fastCheckRecord(
  ir: RecordIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  const parts: string[] = [`typeof ${x}==="object"`, `${x}!==null`, `!Array.isArray(${x})`];

  const kv = `__rk_${ctx.counter++}`;
  const keyCheck = generateFn(ir.keyType, kv, ctx);
  const valCheck = generateFn(ir.valueType, `${x}[${kv}]`, ctx);
  if (keyCheck === null || valCheck === null) return null;

  const conditions: string[] = [];
  if (keyCheck !== "true") conditions.push(keyCheck);
  if (valCheck !== "true") conditions.push(valCheck);

  if (conditions.length > 0) {
    parts.push(`Object.keys(${x}).every(${kv}=>${conditions.join("&&")})`);
  }

  return parts.join("&&");
}
