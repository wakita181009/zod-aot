import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateArrayValidation(
  ir: SchemaIR & { type: "array" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = `if(!Array.isArray(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"array",input:${inputExpr},path:${pathExpr}});}else{`;

  for (const check of ir.checks) {
    switch (check.kind) {
      case "min_length":
        code += `if(${inputExpr}.length<${check.minimum}){${issuesVar}.push({code:"too_small",minimum:${check.minimum},origin:"array",inclusive:true,input:${inputExpr},path:${pathExpr}});}`;
        break;
      case "max_length":
        code += `if(${inputExpr}.length>${check.maximum}){${issuesVar}.push({code:"too_big",maximum:${check.maximum},origin:"array",inclusive:true,input:${inputExpr},path:${pathExpr}});}`;
        break;
      case "length_equals":
        code += `if(${inputExpr}.length<${check.length}){${issuesVar}.push({code:"too_small",minimum:${check.length},origin:"array",inclusive:true,exact:true,input:${inputExpr},path:${pathExpr}});}else if(${inputExpr}.length>${check.length}){${issuesVar}.push({code:"too_big",maximum:${check.length},origin:"array",inclusive:true,exact:true,input:${inputExpr},path:${pathExpr}});}`;
        break;
    }
  }

  const idxVar = `__i_${ctx.counter++}`;
  code += `for(var ${idxVar}=0;${idxVar}<${inputExpr}.length;${idxVar}++){`;
  const elemExpr = `${inputExpr}[${idxVar}]`;
  const elemPath = `${pathExpr}.concat(${idxVar})`;
  code += generateFn(ir.element, elemExpr, elemPath, issuesVar, ctx);
  code += `}`;

  code += `}\n`;
  return code;
}
