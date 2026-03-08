import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";

export function generateNumberValidation(
  ir: SchemaIR & { type: "number" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  _ctx: CodeGenContext,
): string {
  let code = `if(typeof ${inputExpr}!=="number"){${issuesVar}.push({code:"invalid_type",expected:"number",input:${inputExpr},path:${pathExpr}});}`;
  code += `else if(Number.isNaN(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"number",received:"NaN",input:${inputExpr},path:${pathExpr}});}`;
  code += `else if(!Number.isFinite(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"number",received:"Infinity",input:${inputExpr},path:${pathExpr}});}`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      switch (check.kind) {
        case "greater_than":
          if (check.inclusive) {
            code += `if(${inputExpr}<${check.value}){${issuesVar}.push({code:"too_small",minimum:${check.value},origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});}`;
          } else {
            code += `if(${inputExpr}<=${check.value}){${issuesVar}.push({code:"too_small",minimum:${check.value},origin:"number",inclusive:false,input:${inputExpr},path:${pathExpr}});}`;
          }
          break;
        case "less_than":
          if (check.inclusive) {
            code += `if(${inputExpr}>${check.value}){${issuesVar}.push({code:"too_big",maximum:${check.value},origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});}`;
          } else {
            code += `if(${inputExpr}>=${check.value}){${issuesVar}.push({code:"too_big",maximum:${check.value},origin:"number",inclusive:false,input:${inputExpr},path:${pathExpr}});}`;
          }
          break;
        case "number_format":
          if (check.format === "safeint") {
            code += `if(!Number.isSafeInteger(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"int",format:"safeint",input:${inputExpr},path:${pathExpr}});}`;
          }
          break;
        case "multiple_of":
          code += `if(${inputExpr}%${check.value}!==0){${issuesVar}.push({code:"not_multiple_of",divisor:${check.value},origin:"number",input:${inputExpr},path:${pathExpr}});}`;
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
