import { emit } from "../context.js";

export function generateBooleanValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `${emit`
    if(typeof ${inputExpr}!=="boolean"){
      ${issuesVar}.push({code:"invalid_type",expected:"boolean",input:${inputExpr},path:${pathExpr}});
    }
  `}\n`;
}
