import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateNullableValidation(
  ir: SchemaIR & { type: "nullable" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = `if(${inputExpr}!==null){`;
  code += generateFn(ir.inner, inputExpr, pathExpr, issuesVar, ctx);
  code += `}\n`;
  return code;
}
