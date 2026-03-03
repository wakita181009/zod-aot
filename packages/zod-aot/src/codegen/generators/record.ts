import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateRecordValidation(
  ir: SchemaIR & { type: "record" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = `if(typeof ${inputExpr}!=="object"||${inputExpr}===null||Array.isArray(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"object",received:Array.isArray(${inputExpr})?"array":${inputExpr}===null?"null":typeof ${inputExpr},path:${pathExpr},message:"Expected object"});}else{`;

  const keysVar = `__rk_${ctx.counter++}`;
  const idxVar = `__ri_${ctx.counter++}`;
  const keyVar = `__rkey_${ctx.counter++}`;

  code += `var ${keysVar}=Object.keys(${inputExpr});`;
  code += `for(var ${idxVar}=0;${idxVar}<${keysVar}.length;${idxVar}++){`;
  code += `var ${keyVar}=${keysVar}[${idxVar}];`;

  const keyPath = `${pathExpr}.concat(${keyVar})`;
  code += generateFn(ir.keyType, keyVar, keyPath, issuesVar, ctx);

  const valExpr = `${inputExpr}[${keyVar}]`;
  code += generateFn(ir.valueType, valExpr, keyPath, issuesVar, ctx);

  code += `}`;
  code += `}\n`;
  return code;
}
