import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generatePipeValidation(
  ir: SchemaIR & { type: "pipe" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  // Validate input schema first, then output schema sequentially
  return `${generateFn(ir.in, inputExpr, pathExpr, issuesVar, ctx)}${generateFn(ir.out, inputExpr, pathExpr, issuesVar, ctx)}`;
}
