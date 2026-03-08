import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";

export function generateEnumValidation(
  ir: SchemaIR & { type: "enum" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  const setVar = `__enumSet_${ctx.counter++}`;
  ctx.preamble.push(`var ${setVar}=new Set(${JSON.stringify(ir.values)});`);
  return `if(!${setVar}.has(${inputExpr})){${issuesVar}.push({code:"invalid_value",values:${JSON.stringify(ir.values)},input:${inputExpr},path:${pathExpr}});}\n`;
}
