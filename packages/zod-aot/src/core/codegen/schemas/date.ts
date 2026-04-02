import type { DateIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { checkPriority } from "../context.js";
import { emit } from "../emit.js";

export function slowDate(ir: DateIR, g: SlowGen): string {
  let code = "";
  if (ir.coerce) {
    code += emit`try{${g.output}=new Date(${g.input});}catch(_){}`;
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

export function fastDate(ir: DateIR, g: FastGen): string | null {
  if (ir.coerce && !g.probeMode) return null;

  // Probe mode with coerce: check if new Date(input) would produce a valid Date.
  if (ir.coerce && g.probeMode) {
    const x = g.input;
    return `(${x} instanceof Date&&!Number.isNaN(${x}.getTime())||typeof ${x}==="string"&&!Number.isNaN(Date.parse(${x}))||typeof ${x}==="number"&&!Number.isNaN(new Date(${x}).getTime()))`;
  }

  const x = g.input;
  const parts: string[] = [`${x} instanceof Date`, `!Number.isNaN(${x}.getTime())`];

  for (const check of [...ir.checks].sort(checkPriority)) {
    const timeExpr = `${x}.getTime()`;
    switch (check.kind) {
      case "date_greater_than":
        parts.push(
          check.inclusive ? `${timeExpr}>=${check.timestamp}` : `${timeExpr}>${check.timestamp}`,
        );
        break;
      case "date_less_than":
        parts.push(
          check.inclusive ? `${timeExpr}<=${check.timestamp}` : `${timeExpr}<${check.timestamp}`,
        );
        break;
    }
  }

  return parts.join("&&");
}
