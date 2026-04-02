import type { BigIntIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { checkPriority } from "../context.js";
import { emit } from "../emit.js";

export function slowBigInt(ir: BigIntIR, g: SlowGen): string {
  let code = "";
  if (ir.coerce) {
    code += emit`try{${g.output}=BigInt(${g.input});}catch(_){}`;
  }
  code += emit`
    if(typeof ${g.input}!=="bigint"){
      ${g.issues}.push({code:"invalid_type",expected:"bigint",input:${g.input},path:${g.path}});
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of [...ir.checks].sort(checkPriority)) {
      switch (check.kind) {
        case "bigint_greater_than":
          if (check.inclusive) {
            code += emit`
              if(${g.input}<${check.value}n){
                ${g.issues}.push({code:"too_small",minimum:${check.value}n,origin:"bigint",inclusive:true,input:${g.input},path:${g.path}});
              }`;
          } else {
            code += emit`
              if(${g.input}<=${check.value}n){
                ${g.issues}.push({code:"too_small",minimum:${check.value}n,origin:"bigint",inclusive:false,input:${g.input},path:${g.path}});
              }`;
          }
          break;
        case "bigint_less_than":
          if (check.inclusive) {
            code += emit`
              if(${g.input}>${check.value}n){
                ${g.issues}.push({code:"too_big",maximum:${check.value}n,origin:"bigint",inclusive:true,input:${g.input},path:${g.path}});
              }`;
          } else {
            code += emit`
              if(${g.input}>=${check.value}n){
                ${g.issues}.push({code:"too_big",maximum:${check.value}n,origin:"bigint",inclusive:false,input:${g.input},path:${g.path}});
              }`;
          }
          break;
        case "bigint_multiple_of":
          code += emit`
            if(${g.input}%${check.value}n!==0n){
              ${g.issues}.push({code:"not_multiple_of",divisor:${check.value}n,origin:"bigint",input:${g.input},path:${g.path}});
            }`;
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}

export function fastBigInt(ir: BigIntIR, g: FastGen): string | null {
  if (ir.coerce) return null;

  const x = g.input;
  const parts: string[] = [`typeof ${x}==="bigint"`];

  for (const check of [...ir.checks].sort(checkPriority)) {
    switch (check.kind) {
      case "bigint_greater_than":
        parts.push(check.inclusive ? `${x}>=${check.value}n` : `${x}>${check.value}n`);
        break;
      case "bigint_less_than":
        parts.push(check.inclusive ? `${x}<=${check.value}n` : `${x}<${check.value}n`);
        break;
      case "bigint_multiple_of":
        parts.push(`${x}%${check.value}n===0n`);
        break;
    }
  }

  return parts.join("&&");
}
