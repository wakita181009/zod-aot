import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateIntersectionValidation(
  ir: SchemaIR & { type: "intersection" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = generateFn(ir.left, inputExpr, pathExpr, issuesVar, ctx);
  code += generateFn(ir.right, inputExpr, pathExpr, issuesVar, ctx);
  return code;
}
