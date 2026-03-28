import { emit } from "../emit.js";

export function generateVoidValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `${emit`
    if(${inputExpr}!==undefined){
      ${issuesVar}.push({code:"invalid_type",expected:"void",input:${inputExpr},path:${pathExpr}});
    }
  `}\n`;
}
