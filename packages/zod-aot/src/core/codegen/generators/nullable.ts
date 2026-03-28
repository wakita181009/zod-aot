import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../emit.js";

export function generateNullableValidation(
  ir: SchemaIR & { type: "nullable" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  return `${emit`
    if(${inputExpr}!==null){
      ${generateFn(ir.inner, inputExpr, pathExpr, issuesVar, ctx)}
    }
  `}\n`;
}
