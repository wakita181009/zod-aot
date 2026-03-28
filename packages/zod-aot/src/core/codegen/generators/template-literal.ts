import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { escapeString } from "../context.js";
import { emit } from "../emit.js";

export function generateTemplateLiteralValidation(
  ir: SchemaIR & { type: "templateLiteral" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  const regexVar = `__re_tl_${ctx.counter++}`;
  ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(ir.pattern)});`);
  return `${emit`
    if(typeof ${inputExpr}!=="string"){
      ${issuesVar}.push({code:"invalid_type",expected:"string",input:${inputExpr},path:${pathExpr}});
    }else if(!${regexVar}.test(${inputExpr})){
      ${issuesVar}.push({code:"invalid_format",format:"template_literal",pattern:${regexVar}.toString(),input:${inputExpr},path:${pathExpr}});
    }`}\n`;
}
