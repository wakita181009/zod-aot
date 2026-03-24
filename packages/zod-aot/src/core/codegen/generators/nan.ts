import { emit } from "../context.js";

export function generateNanValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `${emit`
    if(typeof ${inputExpr}!=="number"||!Number.isNaN(${inputExpr})){
      ${issuesVar}.push({code:"invalid_type",expected:"nan",input:${inputExpr},path:${pathExpr}});
    }
  `}\n`;
}
