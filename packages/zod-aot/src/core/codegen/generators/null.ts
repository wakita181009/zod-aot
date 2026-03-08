export function generateNullValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `if(${inputExpr}!==null){${issuesVar}.push({code:"invalid_type",expected:"null",input:${inputExpr},path:${pathExpr}});}\n`;
}
