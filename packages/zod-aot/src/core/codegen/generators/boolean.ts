import type { SchemaIR } from "../../types.js";
import { emit } from "../context.js";

export function generateBooleanValidation(
  ir: SchemaIR & { type: "boolean" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  let code = "";
  if (ir.coerce) {
    code += emit`${inputExpr}=Boolean(${inputExpr});`;
  }
  code += emit`
    if(typeof ${inputExpr}!=="boolean"){
      ${issuesVar}.push({code:"invalid_type",expected:"boolean",input:${inputExpr},path:${pathExpr}});
    }
  `;
  return `${code}\n`;
}
