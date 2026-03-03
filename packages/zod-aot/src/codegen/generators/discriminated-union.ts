import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { escapeString } from "../context.js";

export function generateDiscriminatedUnionValidation(
  ir: SchemaIR & { type: "discriminatedUnion" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const discKey = escapeString(ir.discriminator);

  let code = `if(typeof ${inputExpr}!=="object"||${inputExpr}===null||Array.isArray(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"object",received:Array.isArray(${inputExpr})?"array":${inputExpr}===null?"null":typeof ${inputExpr},path:${pathExpr},message:"Expected object"});}else{`;

  const objVar = `__du_${ctx.counter++}`;
  code += `var ${objVar}=${inputExpr};`;

  code += `switch(${objVar}[${discKey}]){`;

  for (const [value, index] of Object.entries(ir.mapping)) {
    const option = ir.options[index] as SchemaIR;
    code += `case ${escapeString(value)}:`;
    code += generateFn(option, objVar, pathExpr, issuesVar, ctx);
    code += `break;`;
  }

  code += `default:${issuesVar}.push({code:"invalid_union",unionErrors:[],path:${pathExpr}.concat(${discKey}),message:"Invalid discriminator value"});`;
  code += `}`;
  code += `}\n`;
  return code;
}
