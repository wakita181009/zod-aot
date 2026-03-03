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
  let code = `if(typeof ${inputExpr}!=="string"){${issuesVar}.push({code:"invalid_type",expected:"string",received:typeof ${inputExpr},path:${pathExpr},message:"Expected string"});}`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_length":
          code += `if(${inputExpr}.length<${check.minimum}){${issuesVar}.push({code:"too_small",minimum:${check.minimum},type:"string",inclusive:true,path:${pathExpr},message:"String must contain at least ${check.minimum} character(s)"});}`;
          break;
        case "max_length":
          code += `if(${inputExpr}.length>${check.maximum}){${issuesVar}.push({code:"too_big",maximum:${check.maximum},type:"string",inclusive:true,path:${pathExpr},message:"String must contain at most ${check.maximum} character(s)"});}`;
          break;
        case "length_equals":
          code += `if(${inputExpr}.length!==${check.length}){${issuesVar}.push({code:"invalid_length",exact:${check.length},type:"string",path:${pathExpr},message:"String must be exactly ${check.length} character(s)"});}`;
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
            code += `if(!(function(s){try{new URL(s);return true;}catch(e){return false;}})(${inputExpr})){${issuesVar}.push({code:"invalid_string",validation:"url",path:${pathExpr},message:"Invalid url"});}`;
            continue;
          } else if (check.format === "uuid") {
            regexVar = `__re_uuid_${ctx.counter++}`;
            ctx.preamble.push(
              `var ${regexVar}=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;`,
            );
          } else {
            regexVar = `__re_${ctx.counter++}`;
            if (check.pattern) {
              ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(check.pattern)});`);
            } else {
              continue;
            }
          }
          code += `if(!${regexVar}.test(${inputExpr})){${issuesVar}.push({code:"invalid_string",validation:${escapeString(check.format)},path:${pathExpr},message:"Invalid ${check.format}"});}`;
          break;
        }
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
