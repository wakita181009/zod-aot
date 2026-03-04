import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";

export function generateBigIntValidation(
  ir: SchemaIR & { type: "bigint" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  _ctx: CodeGenContext,
): string {
  let code = `if(typeof ${inputExpr}!=="bigint"){${issuesVar}.push({code:"invalid_type",expected:"bigint",received:typeof ${inputExpr},path:${pathExpr},message:"Expected bigint"});}`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      switch (check.kind) {
        case "bigint_greater_than":
          if (check.inclusive) {
            code += `if(${inputExpr}<${check.value}n){${issuesVar}.push({code:"too_small",minimum:${check.value}n,type:"bigint",inclusive:true,path:${pathExpr},message:"BigInt must be greater than or equal to ${check.value}"});}`;
          } else {
            code += `if(${inputExpr}<=${check.value}n){${issuesVar}.push({code:"too_small",minimum:${check.value}n,type:"bigint",inclusive:false,path:${pathExpr},message:"BigInt must be greater than ${check.value}"});}`;
          }
          break;
        case "bigint_less_than":
          if (check.inclusive) {
            code += `if(${inputExpr}>${check.value}n){${issuesVar}.push({code:"too_big",maximum:${check.value}n,type:"bigint",inclusive:true,path:${pathExpr},message:"BigInt must be less than or equal to ${check.value}"});}`;
          } else {
            code += `if(${inputExpr}>=${check.value}n){${issuesVar}.push({code:"too_big",maximum:${check.value}n,type:"bigint",inclusive:false,path:${pathExpr},message:"BigInt must be less than ${check.value}"});}`;
          }
          break;
        case "bigint_multiple_of":
          code += `if(${inputExpr}%${check.value}n!==0n){${issuesVar}.push({code:"not_multiple_of",multipleOf:${check.value}n,path:${pathExpr},message:"BigInt must be a multiple of ${check.value}"});}`;
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
