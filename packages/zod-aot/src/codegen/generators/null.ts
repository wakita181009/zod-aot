export function generateNullValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `if(${inputExpr}!==null){${issuesVar}.push({code:"invalid_type",expected:"null",received:typeof ${inputExpr},path:${pathExpr},message:"Expected null"});}\n`;
}
