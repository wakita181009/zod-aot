import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../emit.js";

export function generateSetValidation(
  ir: SchemaIR & { type: "set" },
  inputExpr: string,
  _outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = emit`
    if(!(${inputExpr} instanceof Set)){
      ${issuesVar}.push({code:"invalid_type",expected:"set",input:${inputExpr},path:${pathExpr}});
    }else{`;

  // Size checks
  if (ir.checks) {
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_size":
          code += emit`
            if(${inputExpr}.size<${check.minimum}){
              ${issuesVar}.push({code:"too_small",minimum:${check.minimum},origin:"set",inclusive:true,input:${inputExpr},path:${pathExpr}});
            }`;
          break;
        case "max_size":
          code += emit`
            if(${inputExpr}.size>${check.maximum}){
              ${issuesVar}.push({code:"too_big",maximum:${check.maximum},origin:"set",inclusive:true,input:${inputExpr},path:${pathExpr}});
            }`;
          break;
      }
    }
  }

  // Validate each element
  const idx = ctx.counter++;
  const iterVar = `__set_v${idx}`;
  const idxVar = `__set_i${idx}`;
  code += emit`
    var ${idxVar}=0;
    for(var ${iterVar} of ${inputExpr}){
      ${generateFn(ir.valueType, iterVar, iterVar, `${pathExpr}.concat(${idxVar})`, issuesVar, ctx)}
      ${idxVar}++;
    }
  }`;
  return `${code}\n`;
}
