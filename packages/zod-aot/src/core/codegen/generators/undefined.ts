import { emit } from "../context.js";

export function generateUndefinedValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `${emit`
    if(${inputExpr}!==undefined){
      ${issuesVar}.push({code:"invalid_type",expected:"undefined",input:${inputExpr},path:${pathExpr}});
    }
  `}\n`;
}
