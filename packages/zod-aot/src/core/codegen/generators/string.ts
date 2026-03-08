import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { EMAIL_REGEX_SOURCE, escapeString } from "../context.js";

export function generateStringValidation(
  ir: SchemaIR & { type: "string" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  let code = `if(typeof ${inputExpr}!=="string"){${issuesVar}.push({code:"invalid_type",expected:"string",input:${inputExpr},path:${pathExpr}});}`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_length":
          code += `if(${inputExpr}.length<${check.minimum}){${issuesVar}.push({code:"too_small",minimum:${check.minimum},origin:"string",inclusive:true,input:${inputExpr},path:${pathExpr}});}`;
          break;
        case "max_length":
          code += `if(${inputExpr}.length>${check.maximum}){${issuesVar}.push({code:"too_big",maximum:${check.maximum},origin:"string",inclusive:true,input:${inputExpr},path:${pathExpr}});}`;
          break;
        case "length_equals":
          code += `if(${inputExpr}.length<${check.length}){${issuesVar}.push({code:"too_small",minimum:${check.length},origin:"string",inclusive:true,exact:true,input:${inputExpr},path:${pathExpr}});}else if(${inputExpr}.length>${check.length}){${issuesVar}.push({code:"too_big",maximum:${check.length},origin:"string",inclusive:true,exact:true,input:${inputExpr},path:${pathExpr}});}`;
          break;
        case "string_format": {
          let regexVar: string;
          if (check.format === "email") {
            regexVar = `__re_email_${ctx.counter++}`;
            ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(EMAIL_REGEX_SOURCE)});`);
          } else if (check.format === "regex" && check.pattern) {
            regexVar = `__re_${ctx.counter++}`;
            ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(check.pattern)});`);
          } else if (check.format === "url") {
            code += `if(!(function(s){try{new URL(s);return true;}catch(e){return false;}})(${inputExpr})){${issuesVar}.push({code:"invalid_format",format:"url",input:${inputExpr},path:${pathExpr}});}`;
            continue;
          } else if (check.format === "uuid") {
            regexVar = `__re_uuid_${ctx.counter++}`;
            ctx.preamble.push(
              `var ${regexVar}=/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;`,
            );
          } else {
            regexVar = `__re_${ctx.counter++}`;
            if (check.pattern) {
              ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(check.pattern)});`);
            } else {
              continue;
            }
          }
          code += `if(!${regexVar}.test(${inputExpr})){${issuesVar}.push({code:"invalid_format",format:${escapeString(check.format)},pattern:${regexVar}.toString(),origin:"string",input:${inputExpr},path:${pathExpr}});}`;
          break;
        }
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
