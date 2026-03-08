import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../context.js";

export function generateTupleValidation(
  ir: SchemaIR & { type: "tuple" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const len = ir.items.length;

  let code = emit`
    if(!Array.isArray(${inputExpr})){
      ${issuesVar}.push({code:"invalid_type",expected:"tuple",input:${inputExpr},path:${pathExpr}});
    }else{`;

  // Reject extra elements when no rest element is defined
  if (ir.rest === null) {
    code += emit`
      if(${inputExpr}.length>${len}){
        ${issuesVar}.push({code:"too_big",maximum:${len},inclusive:true,origin:"array",input:${inputExpr},path:${pathExpr}});
      }`;
  }

  for (let i = 0; i < len; i++) {
    const itemIR = ir.items[i] as SchemaIR;
    const elemExpr = `${inputExpr}[${i}]`;
    const elemPath = `${pathExpr}.concat(${i})`;
    code += generateFn(itemIR, elemExpr, elemPath, issuesVar, ctx);
  }

  if (ir.rest !== null) {
    const idxVar = `__ti_${ctx.counter++}`;
    const restExpr = `${inputExpr}[${idxVar}]`;
    const restPath = `${pathExpr}.concat(${idxVar})`;
    code += emit`
      for(var ${idxVar}=${len};${idxVar}<${inputExpr}.length;${idxVar}++){
        ${generateFn(ir.rest, restExpr, restPath, issuesVar, ctx)}
      }`;
  }

  code += `}\n`;
  return code;
}
