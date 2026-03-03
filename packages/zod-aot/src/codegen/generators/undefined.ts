export function generateUndefinedValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `if(${inputExpr}!==undefined){${issuesVar}.push({code:"invalid_type",expected:"undefined",received:typeof ${inputExpr},path:${pathExpr},message:"Expected undefined"});}\n`;
}
