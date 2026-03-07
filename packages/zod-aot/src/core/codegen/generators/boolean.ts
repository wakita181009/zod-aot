import { generateTypeofCheck } from "../context.js";

export function generateBooleanValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `${generateTypeofCheck(inputExpr, "boolean", pathExpr, issuesVar)}\n`;
}
