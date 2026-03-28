import type { EnumIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { ENUM_INLINE_THRESHOLD, escapeString } from "../context.js";

export function fastCheckEnum(ir: EnumIR, x: string, ctx: CodeGenContext): string {
  if (ir.values.length <= ENUM_INLINE_THRESHOLD) {
    // Inline equality checks for small enums, wrapped in parens for precedence safety
    return `(${ir.values.map((v) => `${x}===${escapeString(v)}`).join("||")})`;
  }
  // Use Set for larger enums
  const setVar = `__enumSet_${ctx.counter++}`;
  ctx.preamble.push(`var ${setVar}=new Set(${JSON.stringify(ir.values)});`);
  return `${setVar}.has(${x})`;
}
