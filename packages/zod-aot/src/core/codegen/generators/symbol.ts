import { emit } from "../emit.js";

export function generateSymbolValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `${emit`
    if(typeof ${inputExpr}!=="symbol"){
      ${issuesVar}.push({code:"invalid_type",expected:"symbol",input:${inputExpr},path:${pathExpr}});
    }
  `}\n`;
}
