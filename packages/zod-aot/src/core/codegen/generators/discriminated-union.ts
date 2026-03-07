import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { escapeString, generateObjectCheck } from "../context.js";

export function generateDiscriminatedUnionValidation(
  ir: SchemaIR & { type: "discriminatedUnion" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const discKey = escapeString(ir.discriminator);

  let code = `${generateObjectCheck(inputExpr, pathExpr, issuesVar)}else{`;

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
