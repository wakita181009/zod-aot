import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { emit } from "../context.js";

export function generateBigIntValidation(
  ir: SchemaIR & { type: "bigint" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  _ctx: CodeGenContext,
): string {
  let code = "";
  if (ir.coerce) {
    code += emit`try{${inputExpr}=BigInt(${inputExpr});}catch(_){}`;
  }
  code += emit`
    if(typeof ${inputExpr}!=="bigint"){
      ${issuesVar}.push({code:"invalid_type",expected:"bigint",input:${inputExpr},path:${pathExpr}});
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      switch (check.kind) {
        case "bigint_greater_than":
          if (check.inclusive) {
            code += emit`
              if(${inputExpr}<${check.value}n){
                ${issuesVar}.push({code:"too_small",minimum:${check.value}n,origin:"bigint",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }`;
          } else {
            code += emit`
              if(${inputExpr}<=${check.value}n){
                ${issuesVar}.push({code:"too_small",minimum:${check.value}n,origin:"bigint",inclusive:false,input:${inputExpr},path:${pathExpr}});
              }`;
          }
          break;
        case "bigint_less_than":
          if (check.inclusive) {
            code += emit`
              if(${inputExpr}>${check.value}n){
                ${issuesVar}.push({code:"too_big",maximum:${check.value}n,origin:"bigint",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }`;
          } else {
            code += emit`
              if(${inputExpr}>=${check.value}n){
                ${issuesVar}.push({code:"too_big",maximum:${check.value}n,origin:"bigint",inclusive:false,input:${inputExpr},path:${pathExpr}});
              }`;
          }
          break;
        case "bigint_multiple_of":
          code += emit`
            if(${inputExpr}%${check.value}n!==0n){
              ${issuesVar}.push({code:"not_multiple_of",divisor:${check.value}n,origin:"bigint",input:${inputExpr},path:${pathExpr}});
            }`;
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
