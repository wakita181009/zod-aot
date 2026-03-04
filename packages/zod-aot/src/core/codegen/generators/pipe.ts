import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";

type GenerateValidationFn = (
  ir: SchemaIR,
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
) => string;

export function generatePipeValidation(
  ir: SchemaIR & { type: "pipe" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateValidation: GenerateValidationFn,
): string {
  // Validate input schema first, then output schema sequentially
  let code = generateValidation(ir.in, inputExpr, pathExpr, issuesVar, ctx);
  code += generateValidation(ir.out, inputExpr, pathExpr, issuesVar, ctx);
  return code;
}
