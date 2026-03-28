import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";

export function generateCatchValidation(
  ir: SchemaIR & { type: "catch" },
  inputExpr: string,
  pathExpr: string,
  _issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  const defaultStr = ir.defaultValue === undefined ? "undefined" : JSON.stringify(ir.defaultValue);
  const tempIssues = `__ci_${ctx.counter++}`;
  return [
    `var ${tempIssues}=[];`,
    generateFn(ir.inner, inputExpr, pathExpr, tempIssues, ctx),
    `if(${tempIssues}.length>0){${inputExpr}=${defaultStr};}`,
    "",
  ].join("\n");
}
