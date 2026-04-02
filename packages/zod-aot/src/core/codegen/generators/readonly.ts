import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateReadonlyValidation(
  ir: SchemaIR & { type: "readonly" },
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  return generateFn(ir.inner, inputExpr, outputExpr, pathExpr, issuesVar, ctx);
}
