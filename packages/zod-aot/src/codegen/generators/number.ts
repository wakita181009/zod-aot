import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";

export function generateNumberValidation(
  ir: SchemaIR & { type: "number" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  _ctx: CodeGenContext,
): string {
  let code = `if(typeof ${inputExpr}!=="number"||!Number.isFinite(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"number",received:typeof ${inputExpr},path:${pathExpr},message:"Expected number"});}`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      switch (check.kind) {
        case "greater_than":
          if (check.inclusive) {
            code += `if(${inputExpr}<${check.value}){${issuesVar}.push({code:"too_small",minimum:${check.value},type:"number",inclusive:true,path:${pathExpr},message:"Number must be greater than or equal to ${check.value}"});}`;
          } else {
            code += `if(${inputExpr}<=${check.value}){${issuesVar}.push({code:"too_small",minimum:${check.value},type:"number",inclusive:false,path:${pathExpr},message:"Number must be greater than ${check.value}"});}`;
          }
          break;
        case "less_than":
          if (check.inclusive) {
            code += `if(${inputExpr}>${check.value}){${issuesVar}.push({code:"too_big",maximum:${check.value},type:"number",inclusive:true,path:${pathExpr},message:"Number must be less than or equal to ${check.value}"});}`;
          } else {
            code += `if(${inputExpr}>=${check.value}){${issuesVar}.push({code:"too_big",maximum:${check.value},type:"number",inclusive:false,path:${pathExpr},message:"Number must be less than ${check.value}"});}`;
          }
          break;
        case "number_format":
          if (check.format === "safeint") {
            code += `if(!Number.isSafeInteger(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"integer",received:"float",path:${pathExpr},message:"Expected integer"});}`;
          }
          break;
        case "multiple_of":
          code += `if(${inputExpr}%${check.value}!==0){${issuesVar}.push({code:"not_multiple_of",multipleOf:${check.value},path:${pathExpr},message:"Number must be a multiple of ${check.value}"});}`;
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
