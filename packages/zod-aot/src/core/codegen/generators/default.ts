import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateDefaultValidation(
  ir: SchemaIR & { type: "default" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const defaultValueStr = JSON.stringify(ir.defaultValue);
  let code = `if(${inputExpr}===undefined){${inputExpr}=${defaultValueStr};}\n`;
  code += generateFn(ir.inner, inputExpr, pathExpr, issuesVar, ctx);
  return code;
}
