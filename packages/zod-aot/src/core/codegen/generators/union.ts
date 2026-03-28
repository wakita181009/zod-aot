import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../emit.js";

export function generateUnionValidation(
  ir: SchemaIR & { type: "union" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const resultVar = `__u_${ctx.counter++}`;
  const errorsVar = `__ue_${ctx.counter++}`;
  let code = `var ${resultVar}=false;var ${errorsVar}=[];`;

  for (const option of ir.options) {
    const tmpIssues = `__ui_${ctx.counter++}`;
    // Apply __msg to inner branch issues so they have messages when included in union errors
    const innerIdx = `__ufi_${ctx.counter++}`;
    code += emit`
      if(!${resultVar}){
        var ${tmpIssues}=[];
        ${generateFn(option, inputExpr, pathExpr, tmpIssues, ctx)}
        if(${tmpIssues}.length===0){
          ${resultVar}=true;
        }else{
          if(typeof __msg==="function"){
            for(var ${innerIdx}=0;${innerIdx}<${tmpIssues}.length;${innerIdx}++){
              ${tmpIssues}[${innerIdx}].message=__msg(${tmpIssues}[${innerIdx}]);
              delete ${tmpIssues}[${innerIdx}].input;
            }
          }
          ${errorsVar}.push(${tmpIssues});
        }
      }`;
  }

  code += emit`
    if(!${resultVar}){
      ${issuesVar}.push({code:"invalid_union",errors:${errorsVar},input:${inputExpr},path:${pathExpr}});
    }`;
  return `${code}\n`;
}
