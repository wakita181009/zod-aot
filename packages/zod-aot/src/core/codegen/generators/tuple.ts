import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateTupleValidation(
  ir: SchemaIR & { type: "tuple" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const len = ir.items.length;

  let code = `if(!Array.isArray(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"tuple",received:${inputExpr}===null?"null":typeof ${inputExpr},path:${pathExpr},message:"Expected tuple"});}else{`;

  if (ir.rest === null) {
    code += `if(${inputExpr}.length>${len}){${issuesVar}.push({code:"too_big",maximum:${len},inclusive:true,origin:"tuple",path:${pathExpr},message:"Expected array with at most ${len} element(s)"});}`;
  }

  for (let i = 0; i < len; i++) {
    const itemIR = ir.items[i] as SchemaIR;
    const elemExpr = `${inputExpr}[${i}]`;
    const elemPath = `${pathExpr}.concat(${i})`;
    code += generateFn(itemIR, elemExpr, elemPath, issuesVar, ctx);
  }

  if (ir.rest !== null) {
    const idxVar = `__ti_${ctx.counter++}`;
    code += `for(var ${idxVar}=${len};${idxVar}<${inputExpr}.length;${idxVar}++){`;
    const restExpr = `${inputExpr}[${idxVar}]`;
    const restPath = `${pathExpr}.concat(${idxVar})`;
    code += generateFn(ir.rest, restExpr, restPath, issuesVar, ctx);
    code += `}`;
  }

  code += `}\n`;
  return code;
}
