import type { ObjectIR } from "../../types.js";
import type { CodeGenContext, GenerateFastCheckFn } from "../context.js";
import { escapeString } from "../context.js";

export function fastCheckObject(
  ir: ObjectIR,
  x: string,
  ctx: CodeGenContext,
  generateFn: GenerateFastCheckFn,
): string | null {
  // Object with refine effects is not eligible for Fast Path
  if (ir.checks && ir.checks.length > 0) return null;

  const parts: string[] = [`typeof ${x}==="object"`, `${x}!==null`, `!Array.isArray(${x})`];

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${x}[${escapeString(key)}]`;
    const propCheck = generateFn(propIR, propExpr, ctx);
    if (propCheck === null) return null; // All-or-nothing
    parts.push(propCheck);
  }

  return parts.join("&&");
}
