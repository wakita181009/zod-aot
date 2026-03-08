import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../context.js";

export function generateRecordValidation(
  ir: SchemaIR & { type: "record" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = emit`
    if(typeof ${inputExpr}!=="object"||${inputExpr}===null||Array.isArray(${inputExpr})){
      ${issuesVar}.push({code:"invalid_type",expected:"record",input:${inputExpr},path:${pathExpr}});
    }else{`;

  const keysVar = `__rk_${ctx.counter++}`;
  const idxVar = `__ri_${ctx.counter++}`;
  const keyVar = `__rkey_${ctx.counter++}`;
  const keyPath = `${pathExpr}.concat(${keyVar})`;
  const valExpr = `${inputExpr}[${keyVar}]`;

  code += emit`
    var ${keysVar}=Object.keys(${inputExpr});
    for(var ${idxVar}=0;${idxVar}<${keysVar}.length;${idxVar}++){
      var ${keyVar}=${keysVar}[${idxVar}];
      ${generateFn(ir.keyType, keyVar, keyPath, issuesVar, ctx)}
      ${generateFn(ir.valueType, valExpr, keyPath, issuesVar, ctx)}
    }
  }`;
  return `${code}\n`;
}
