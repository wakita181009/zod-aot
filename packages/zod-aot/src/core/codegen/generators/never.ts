import { emit } from "../emit.js";

export function generateNeverValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `${emit`
    ${issuesVar}.push({code:"invalid_type",expected:"never",input:${inputExpr},path:${pathExpr}});
  `}\n`;
}
