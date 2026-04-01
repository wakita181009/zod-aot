import type { SchemaIR } from "../../types.js";
import { emit } from "../emit.js";

export function generateDateValidation(
  ir: SchemaIR & { type: "date" },
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  let code = "";
  if (ir.coerce) {
    code += emit`${outputExpr}=new Date(${inputExpr});`;
  }
  code += emit`
    if(!(${inputExpr} instanceof Date)){
      ${issuesVar}.push({code:"invalid_type",expected:"date",input:${inputExpr},path:${pathExpr}});
    }else if(isNaN(${inputExpr}.getTime())){
      ${issuesVar}.push({code:"invalid_type",expected:"date",received:"Invalid Date",input:${inputExpr},path:${pathExpr}});
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      const timeExpr = `${inputExpr}.getTime()`;
      switch (check.kind) {
        case "date_greater_than":
          if (check.inclusive) {
            code += emit`
              if(${timeExpr}<${check.timestamp}){
                ${issuesVar}.push({code:"too_small",minimum:${check.timestamp},inclusive:true,origin:"date",input:${inputExpr},path:${pathExpr}});
              }`;
          } else {
            code += emit`
              if(${timeExpr}<=${check.timestamp}){
                ${issuesVar}.push({code:"too_small",minimum:${check.timestamp},inclusive:false,origin:"date",input:${inputExpr},path:${pathExpr}});
              }`;
          }
          break;
        case "date_less_than":
          if (check.inclusive) {
            code += emit`
              if(${timeExpr}>${check.timestamp}){
                ${issuesVar}.push({code:"too_big",maximum:${check.timestamp},inclusive:true,origin:"date",input:${inputExpr},path:${pathExpr}});
              }`;
          } else {
            code += emit`
              if(${timeExpr}>=${check.timestamp}){
                ${issuesVar}.push({code:"too_big",maximum:${check.timestamp},inclusive:false,origin:"date",input:${inputExpr},path:${pathExpr}});
              }`;
          }
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
