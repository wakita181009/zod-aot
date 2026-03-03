import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateOptionalValidation(
  ir: SchemaIR & { type: "optional" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = `if(${inputExpr}!==undefined){`;
  code += generateFn(ir.inner, inputExpr, pathExpr, issuesVar, ctx);
  code += `}\n`;
  return code;
}
