import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../emit.js";

export function generateDefaultValidation(
  ir: SchemaIR & { type: "default" },
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const defaultValueStr = JSON.stringify(ir.defaultValue);
  return `${emit`
    if(${inputExpr}===undefined){
      ${outputExpr}=${defaultValueStr};
    }
  `}\n${generateFn(ir.inner, outputExpr, outputExpr, pathExpr, issuesVar, ctx)}`;
}
