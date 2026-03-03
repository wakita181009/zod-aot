export function generateBooleanValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `if(typeof ${inputExpr}!=="boolean"){${issuesVar}.push({code:"invalid_type",expected:"boolean",received:typeof ${inputExpr},path:${pathExpr},message:"Expected boolean"});}\n`;
}
