import type { DateIR } from "../../types.js";
import type { SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowDate(ir: DateIR, g: SlowGen): string {
  let code = "";
  if (ir.coerce) {
    code += emit`${g.output}=new Date(${g.input});`;
  }
  code += emit`
    if(!(${g.input} instanceof Date)){
      ${g.issues}.push({code:"invalid_type",expected:"date",input:${g.input},path:${g.path}});
    }else if(isNaN(${g.input}.getTime())){
      ${g.issues}.push({code:"invalid_type",expected:"date",received:"Invalid Date",input:${g.input},path:${g.path}});
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      const timeExpr = `${g.input}.getTime()`;
      switch (check.kind) {
        case "date_greater_than":
          if (check.inclusive) {
            code += emit`
              if(${timeExpr}<${check.timestamp}){
                ${g.issues}.push({code:"too_small",minimum:${check.timestamp},inclusive:true,origin:"date",input:${g.input},path:${g.path}});
              }`;
          } else {
            code += emit`
              if(${timeExpr}<=${check.timestamp}){
                ${g.issues}.push({code:"too_small",minimum:${check.timestamp},inclusive:false,origin:"date",input:${g.input},path:${g.path}});
              }`;
          }
          break;
        case "date_less_than":
          if (check.inclusive) {
            code += emit`
              if(${timeExpr}>${check.timestamp}){
                ${g.issues}.push({code:"too_big",maximum:${check.timestamp},inclusive:true,origin:"date",input:${g.input},path:${g.path}});
              }`;
          } else {
            code += emit`
              if(${timeExpr}>=${check.timestamp}){
                ${g.issues}.push({code:"too_big",maximum:${check.timestamp},inclusive:false,origin:"date",input:${g.input},path:${g.path}});
              }`;
          }
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
