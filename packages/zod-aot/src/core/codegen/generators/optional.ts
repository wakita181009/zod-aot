import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../emit.js";

export function generateOptionalValidation(
  ir: SchemaIR & { type: "optional" },
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  return `${emit`
    if(${inputExpr}!==undefined){
      ${generateFn(ir.inner, inputExpr, outputExpr, pathExpr, issuesVar, ctx)}
    }
  `}\n`;
}
