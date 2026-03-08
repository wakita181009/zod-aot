import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../context.js";

export function generateMapValidation(
  ir: SchemaIR & { type: "map" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const idx = ctx.counter++;
  const entryVar = `__map_e${idx}`;
  const idxVar = `__map_i${idx}`;

  return `${emit`
    if(!(${inputExpr} instanceof Map)){
      ${issuesVar}.push({code:"invalid_type",expected:"map",input:${inputExpr},path:${pathExpr}});
    }else{
      var ${idxVar}=0;
      for(var ${entryVar} of ${inputExpr}){
        ${generateFn(ir.keyType, `${entryVar}[0]`, `${pathExpr}.concat(${idxVar},"key")`, issuesVar, ctx)}
        ${generateFn(ir.valueType, `${entryVar}[1]`, `${pathExpr}.concat(${idxVar},"value")`, issuesVar, ctx)}
        ${idxVar}++;
      }
    }
  `}\n`;
}
