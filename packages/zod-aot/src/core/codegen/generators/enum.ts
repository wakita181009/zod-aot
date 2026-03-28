import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { ENUM_INLINE_THRESHOLD, escapeString } from "../context.js";
import { emit } from "../emit.js";

export function generateEnumValidation(
  ir: SchemaIR & { type: "enum" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  if (ir.values.length <= ENUM_INLINE_THRESHOLD) {
    // Inline equality checks for small enums (avoids Set allocation in preamble)
    const condition = ir.values.map((v) => `${inputExpr}!==${escapeString(v)}`).join("&&");
    return `${emit`
      if(${condition}){
        ${issuesVar}.push({code:"invalid_value",values:${JSON.stringify(ir.values)},input:${inputExpr},path:${pathExpr}});
      }
    `}\n`;
  }
  const setVar = `__enumSet_${ctx.counter++}`;
  ctx.preamble.push(`var ${setVar}=new Set(${JSON.stringify(ir.values)});`);
  return `${emit`
    if(!${setVar}.has(${inputExpr})){
      ${issuesVar}.push({code:"invalid_value",values:${JSON.stringify(ir.values)},input:${inputExpr},path:${pathExpr}});
    }
  `}\n`;
}
