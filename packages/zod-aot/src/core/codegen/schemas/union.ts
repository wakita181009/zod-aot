import type { SchemaIR, UnionIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowUnion(ir: SchemaIR & { type: "union" }, g: SlowGen): string {
  const resultVar = g.temp("u");
  const errorsVar = g.temp("ue");
  let code = `var ${resultVar}=false;var ${errorsVar}=[];`;

  for (const option of ir.options) {
    const tmpIssues = g.temp("ui");
    // Apply __msg to inner branch issues so they have messages when included in union errors
    const innerIdx = g.temp("ufi");
    code += emit`
      if(!${resultVar}){
        var ${tmpIssues}=[];
        ${g.visit(option, { issues: tmpIssues })}
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
      ${g.issues}.push({code:"invalid_union",errors:${errorsVar},input:${g.input},path:${g.path}});
    }`;
  return `${code}\n`;
}

export function fastUnion(ir: UnionIR, g: FastGen): string | null {
  const optionChecks: string[] = [];
  for (const option of ir.options) {
    const check = g.visit(option);
    if (check === null) return null;
    optionChecks.push(`(${check})`);
  }
  // Wrap in parens — || has lower precedence than && in parent expressions
  return `(${optionChecks.join("||")})`;
}
