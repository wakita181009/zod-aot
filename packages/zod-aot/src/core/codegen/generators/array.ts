import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { hasMutation } from "../context.js";
import { emit } from "../emit.js";
import { generateRefineCheck } from "./effect.js";

export function generateArrayValidation(
  ir: SchemaIR & { type: "array" },
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = emit`
    if(!Array.isArray(${inputExpr})){
      ${issuesVar}.push({code:"invalid_type",expected:"array",input:${inputExpr},path:${pathExpr}});
    }else{`;

  if (hasMutation(ir.element)) {
    code += `${outputExpr}=${inputExpr}.slice();`;
  }

  for (const check of ir.checks) {
    switch (check.kind) {
      case "min_length":
        code += emit`
          if(${inputExpr}.length<${check.minimum}){
            ${issuesVar}.push({code:"too_small",minimum:${check.minimum},origin:"array",inclusive:true,input:${inputExpr},path:${pathExpr}});
          }`;
        break;
      case "max_length":
        code += emit`
          if(${inputExpr}.length>${check.maximum}){
            ${issuesVar}.push({code:"too_big",maximum:${check.maximum},origin:"array",inclusive:true,input:${inputExpr},path:${pathExpr}});
          }`;
        break;
      case "length_equals":
        code += emit`
          if(${inputExpr}.length<${check.length}){
            ${issuesVar}.push({code:"too_small",minimum:${check.length},origin:"array",inclusive:true,exact:true,input:${inputExpr},path:${pathExpr}});
          }else if(${inputExpr}.length>${check.length}){
            ${issuesVar}.push({code:"too_big",maximum:${check.length},origin:"array",inclusive:true,exact:true,input:${inputExpr},path:${pathExpr}});
          }`;
        break;
      case "refine_effect":
        code += generateRefineCheck(check, inputExpr, pathExpr, issuesVar);
        break;
    }
  }

  const idxVar = `__i_${ctx.counter++}`;
  const elemExpr = `${inputExpr}[${idxVar}]`;
  const elemPath = `${pathExpr}.concat(${idxVar})`;
  code += emit`
    for(var ${idxVar}=0;${idxVar}<${inputExpr}.length;${idxVar}++){
      ${generateFn(ir.element, elemExpr, elemExpr, elemPath, issuesVar, ctx)}
    }
  }`;
  return `${code}\n`;
}
