import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import {
  checkPriority,
  EMAIL_REGEX_SOURCE,
  emit,
  escapeString,
  UUID_REGEX_SOURCE,
} from "../context.js";

export function generateStringValidation(
  ir: SchemaIR & { type: "string" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  let code = "";
  if (ir.coerce) {
    code += emit`${inputExpr}=String(${inputExpr});`;
  }
  code += emit`
    if(typeof ${inputExpr}!=="string"){
      ${issuesVar}.push({code:"invalid_type",expected:"string",input:${inputExpr},path:${pathExpr}});
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of [...ir.checks].sort(checkPriority)) {
      switch (check.kind) {
        case "min_length":
          code += emit`
            if(${inputExpr}.length<${check.minimum}){
              ${issuesVar}.push({code:"too_small",minimum:${check.minimum},origin:"string",inclusive:true,input:${inputExpr},path:${pathExpr}});
            }`;
          break;
        case "max_length":
          code += emit`
            if(${inputExpr}.length>${check.maximum}){
              ${issuesVar}.push({code:"too_big",maximum:${check.maximum},origin:"string",inclusive:true,input:${inputExpr},path:${pathExpr}});
            }`;
          break;
        case "length_equals":
          code += emit`
            if(${inputExpr}.length<${check.length}){
              ${issuesVar}.push({code:"too_small",minimum:${check.length},origin:"string",inclusive:true,exact:true,input:${inputExpr},path:${pathExpr}});
            }else if(${inputExpr}.length>${check.length}){
              ${issuesVar}.push({code:"too_big",maximum:${check.length},origin:"string",inclusive:true,exact:true,input:${inputExpr},path:${pathExpr}});
            }`;
          break;
        case "includes":
          code += emit`
            if(!${inputExpr}.includes(${escapeString(check.includes)}${check.position !== undefined ? `,${check.position}` : ""})){
              ${issuesVar}.push({code:"invalid_format",format:"includes",includes:${escapeString(check.includes)},input:${inputExpr},path:${pathExpr}});
            }`;
          break;
        case "starts_with":
          code += emit`
            if(!${inputExpr}.startsWith(${escapeString(check.prefix)})){
              ${issuesVar}.push({code:"invalid_format",format:"starts_with",prefix:${escapeString(check.prefix)},input:${inputExpr},path:${pathExpr}});
            }`;
          break;
        case "ends_with":
          code += emit`
            if(!${inputExpr}.endsWith(${escapeString(check.suffix)})){
              ${issuesVar}.push({code:"invalid_format",format:"ends_with",suffix:${escapeString(check.suffix)},input:${inputExpr},path:${pathExpr}});
            }`;
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
            code += emit`
              if(!(function(s){try{new URL(s);return true;}catch(e){return false;}})(${inputExpr})){
                ${issuesVar}.push({code:"invalid_format",format:"url",input:${inputExpr},path:${pathExpr}});
              }`;
            continue;
          } else if (check.format === "uuid") {
            regexVar = `__re_uuid_${ctx.counter++}`;
            const uuidPattern = check.pattern ?? UUID_REGEX_SOURCE;
            ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(uuidPattern)});`);
          } else {
            regexVar = `__re_${ctx.counter++}`;
            if (check.pattern) {
              ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(check.pattern)});`);
            } else {
              continue;
            }
          }
          code += emit`
            if(!${regexVar}.test(${inputExpr})){
              ${issuesVar}.push({code:"invalid_format",format:${escapeString(check.format)},pattern:${regexVar}.toString(),origin:"string",input:${inputExpr},path:${pathExpr}});
            }`;
          break;
        }
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
