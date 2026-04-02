import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateIntersectionValidation(
  ir: SchemaIR & { type: "intersection" },
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  return `${generateFn(ir.left, inputExpr, outputExpr, pathExpr, issuesVar, ctx)}${generateFn(ir.right, outputExpr, outputExpr, pathExpr, issuesVar, ctx)}`;
}
