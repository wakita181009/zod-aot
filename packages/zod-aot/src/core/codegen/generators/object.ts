import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { escapeString, generateObjectCheck } from "../context.js";

export function generateObjectValidation(
  ir: SchemaIR & { type: "object" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = `${generateObjectCheck(inputExpr, pathExpr, issuesVar)}else{`;

  const objVar = `__o_${ctx.counter++}`;
  code += `var ${objVar}=${inputExpr};`;

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${objVar}[${escapeString(key)}]`;
    const propPath = `${pathExpr}.concat(${escapeString(key)})`;
    code += generateFn(propIR, propExpr, propPath, issuesVar, ctx);
  }

  code += `}\n`;
  return code;
}
