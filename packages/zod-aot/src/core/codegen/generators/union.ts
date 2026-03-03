import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateUnionValidation(
  ir: SchemaIR & { type: "union" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const resultVar = `__u_${ctx.counter++}`;
  let code = `var ${resultVar}=false;`;

  for (const option of ir.options) {
    const tmpIssues = `__ui_${ctx.counter++}`;
    code += `if(!${resultVar}){var ${tmpIssues}=[];`;
    code += generateFn(option, inputExpr, pathExpr, tmpIssues, ctx);
    code += `if(${tmpIssues}.length===0){${resultVar}=true;}}`;
  }

  code += `if(!${resultVar}){${issuesVar}.push({code:"invalid_union",unionErrors:[],path:${pathExpr},message:"Invalid input"});}\n`;
  return code;
}
