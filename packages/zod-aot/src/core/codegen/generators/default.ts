import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../context.js";

export function generateDefaultValidation(
  ir: SchemaIR & { type: "default" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const defaultValueStr = JSON.stringify(ir.defaultValue);
  return `${emit`
    if(${inputExpr}===undefined){
      ${inputExpr}=${defaultValueStr};
    }
  `}\n${generateFn(ir.inner, inputExpr, pathExpr, issuesVar, ctx)}`;
}
