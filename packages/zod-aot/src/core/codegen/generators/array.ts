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
  let code = `if(!Array.isArray(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"array",received:typeof ${inputExpr},path:${pathExpr},message:"Expected array"});}else{`;

  for (const check of ir.checks) {
    switch (check.kind) {
      case "min_length":
        code += `if(${inputExpr}.length<${check.minimum}){${issuesVar}.push({code:"too_small",minimum:${check.minimum},type:"array",inclusive:true,path:${pathExpr},message:"Array must contain at least ${check.minimum} element(s)"});}`;
        break;
      case "max_length":
        code += `if(${inputExpr}.length>${check.maximum}){${issuesVar}.push({code:"too_big",maximum:${check.maximum},type:"array",inclusive:true,path:${pathExpr},message:"Array must contain at most ${check.maximum} element(s)"});}`;
        break;
      case "length_equals":
        code += `if(${inputExpr}.length!==${check.length}){${issuesVar}.push({code:"invalid_length",exact:${check.length},type:"array",path:${pathExpr},message:"Array must contain exactly ${check.length} element(s)"});}`;
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
