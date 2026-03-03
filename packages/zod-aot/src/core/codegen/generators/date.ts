import type { SchemaIR } from "../../types.js";

export function generateDateValidation(
  ir: SchemaIR & { type: "date" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  let code = `if(!(${inputExpr} instanceof Date)||isNaN(${inputExpr}.getTime())){${issuesVar}.push({code:"invalid_type",expected:"date",received:${inputExpr} instanceof Date?"Invalid Date":typeof ${inputExpr},path:${pathExpr},message:"Expected date"});}`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      const timeExpr = `${inputExpr}.getTime()`;
      switch (check.kind) {
        case "date_greater_than":
          if (check.inclusive) {
            code += `if(${timeExpr}<${check.timestamp}){${issuesVar}.push({code:"too_small",minimum:${check.timestamp},inclusive:true,origin:"date",path:${pathExpr},message:"Date must be >= ${check.value}"});}`;
          } else {
            code += `if(${timeExpr}<=${check.timestamp}){${issuesVar}.push({code:"too_small",minimum:${check.timestamp},inclusive:false,origin:"date",path:${pathExpr},message:"Date must be > ${check.value}"});}`;
          }
          break;
        case "date_less_than":
          if (check.inclusive) {
            code += `if(${timeExpr}>${check.timestamp}){${issuesVar}.push({code:"too_big",maximum:${check.timestamp},inclusive:true,origin:"date",path:${pathExpr},message:"Date must be <= ${check.value}"});}`;
          } else {
            code += `if(${timeExpr}>=${check.timestamp}){${issuesVar}.push({code:"too_big",maximum:${check.timestamp},inclusive:false,origin:"date",path:${pathExpr},message:"Date must be < ${check.value}"});}`;
          }
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
