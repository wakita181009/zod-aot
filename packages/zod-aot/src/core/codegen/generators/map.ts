import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateMapValidation(
  ir: SchemaIR & { type: "map" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = `if(!(${inputExpr} instanceof Map)){${issuesVar}.push({code:"invalid_type",expected:"map",input:${inputExpr},path:${pathExpr}});}`;

  code += `else{`;

  const idx = ctx.counter++;
  const entryVar = `__map_e${idx}`;
  const idxVar = `__map_i${idx}`;
  code += `var ${idxVar}=0;`;
  code += `for(var ${entryVar} of ${inputExpr}){`;

  // Validate key
  code += generateFn(
    ir.keyType,
    `${entryVar}[0]`,
    `${pathExpr}.concat(${idxVar},"key")`,
    issuesVar,
    ctx,
  );

  // Validate value
  code += generateFn(
    ir.valueType,
    `${entryVar}[1]`,
    `${pathExpr}.concat(${idxVar},"value")`,
    issuesVar,
    ctx,
  );

  code += `${idxVar}++;`;
  code += `}`;

  code += `}`;
  return `${code}\n`;
}
