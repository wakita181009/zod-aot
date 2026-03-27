import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { addPreambleVar, emit } from "../context.js";

export function generateEnumValidation(
  ir: SchemaIR & { type: "enum" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  const setVar = addPreambleVar(ctx, "__enumSet_", `new Set(${JSON.stringify(ir.values)})`);
  return `${emit`
    if(!${setVar}.has(${inputExpr})){
      ${issuesVar}.push({code:"invalid_value",values:${JSON.stringify(ir.values)},input:${inputExpr},path:${pathExpr}});
    }
  `}\n`;
}
