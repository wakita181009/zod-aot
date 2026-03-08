import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateSetValidation(
  ir: SchemaIR & { type: "set" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = `if(!(${inputExpr} instanceof Set)){${issuesVar}.push({code:"invalid_type",expected:"set",input:${inputExpr},path:${pathExpr}});}`;

  code += `else{`;

  // Size checks
  if (ir.checks) {
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_size":
          code += `if(${inputExpr}.size<${check.minimum}){${issuesVar}.push({code:"too_small",minimum:${check.minimum},origin:"set",inclusive:true,input:${inputExpr},path:${pathExpr}});}`;
          break;
        case "max_size":
          code += `if(${inputExpr}.size>${check.maximum}){${issuesVar}.push({code:"too_big",maximum:${check.maximum},origin:"set",inclusive:true,input:${inputExpr},path:${pathExpr}});}`;
          break;
      }
    }
  }

  // Validate each element
  const idx = ctx.counter++;
  const iterVar = `__set_v${idx}`;
  const idxVar = `__set_i${idx}`;
  code += `var ${idxVar}=0;`;
  code += `for(var ${iterVar} of ${inputExpr}){`;
  code += generateFn(ir.valueType, iterVar, `${pathExpr}.concat(${idxVar})`, issuesVar, ctx);
  code += `${idxVar}++;`;
  code += `}`;

  code += `}`;
  return `${code}\n`;
}
