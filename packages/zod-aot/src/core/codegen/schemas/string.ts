import type { CheckIR, StringIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import {
  checkPriority,
  EMAIL_REGEX_SOURCE,
  escapeString,
  sortChecksPreservingEffects,
  UUID_REGEX_SOURCE,
} from "../context.js";
import { emit } from "../emit.js";
import { refineCheck } from "./effect.js";

export function slowString(ir: StringIR, g: SlowGen): string {
  let code = "";
  if (ir.coerce) {
    code += emit`try{${g.output}=String(${g.input});}catch(_){}`;
  }
  code += emit`
    if(typeof ${g.input}!=="string"){
      ${g.issues}.push({code:"invalid_type",expected:"string",input:${g.input},path:${g.path}});
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of sortChecksPreservingEffects([...ir.checks])) {
      switch (check.kind) {
        case "min_length":
          code += emit`
            if(${g.input}.length<${check.minimum}){
              ${g.issues}.push({code:"too_small",minimum:${check.minimum},origin:"string",inclusive:true,input:${g.input},path:${g.path}});
            }`;
          break;
        case "max_length":
          code += emit`
            if(${g.input}.length>${check.maximum}){
              ${g.issues}.push({code:"too_big",maximum:${check.maximum},origin:"string",inclusive:true,input:${g.input},path:${g.path}});
            }`;
          break;
        case "length_equals":
          code += emit`
            if(${g.input}.length<${check.length}){
              ${g.issues}.push({code:"too_small",minimum:${check.length},origin:"string",inclusive:true,exact:true,input:${g.input},path:${g.path}});
            }else if(${g.input}.length>${check.length}){
              ${g.issues}.push({code:"too_big",maximum:${check.length},origin:"string",inclusive:true,exact:true,input:${g.input},path:${g.path}});
            }`;
          break;
        case "includes":
          code += emit`
            if(!${g.input}.includes(${escapeString(check.includes)}${check.position !== undefined ? `,${check.position}` : ""})){
              ${g.issues}.push({code:"invalid_format",format:"includes",includes:${escapeString(check.includes)},input:${g.input},path:${g.path}});
            }`;
          break;
        case "starts_with":
          code += emit`
            if(!${g.input}.startsWith(${escapeString(check.prefix)})){
              ${g.issues}.push({code:"invalid_format",format:"starts_with",prefix:${escapeString(check.prefix)},input:${g.input},path:${g.path}});
            }`;
          break;
        case "ends_with":
          code += emit`
            if(!${g.input}.endsWith(${escapeString(check.suffix)})){
              ${g.issues}.push({code:"invalid_format",format:"ends_with",suffix:${escapeString(check.suffix)},input:${g.input},path:${g.path}});
            }`;
          break;
        case "refine_effect":
          code += refineCheck(check, g.input, g);
          break;
        case "string_format": {
          let regexVar: string;
          if (check.format === "email") {
            regexVar = g.regex("email", EMAIL_REGEX_SOURCE);
          } else if (check.format === "regex" && check.pattern) {
            regexVar = g.regex("str", check.pattern);
          } else if (check.format === "url") {
            code += emit`
              if(!(function(s){try{new URL(s);return true;}catch(e){return false;}})(${g.input})){
                ${g.issues}.push({code:"invalid_format",format:"url",input:${g.input},path:${g.path}});
              }`;
            continue;
          } else if (check.format === "uuid") {
            const uuidPattern = check.pattern ?? UUID_REGEX_SOURCE;
            regexVar = g.regex("uuid", uuidPattern);
          } else {
            if (check.pattern) {
              regexVar = g.regex("str", check.pattern);
            } else {
              continue;
            }
          }
          code += emit`
            if(!${regexVar}.test(${g.input})){
              ${g.issues}.push({code:"invalid_format",format:${escapeString(check.format)},pattern:${regexVar}.toString(),origin:"string",input:${g.input},path:${g.path}});
            }`;
          break;
        }
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}

export function fastString(ir: StringIR, g: FastGen): string | null {
  if (ir.coerce) return null;
  if (ir.checks.some((c) => c.kind === "refine_effect")) return null;

  const x = g.input;
  const parts: string[] = [`typeof ${x}==="string"`];
  const checks = ir.checks.filter((c): c is CheckIR => c.kind !== "refine_effect");

  for (const check of checks.sort(checkPriority)) {
    switch (check.kind) {
      case "min_length":
        parts.push(`${x}.length>=${check.minimum}`);
        break;
      case "max_length":
        parts.push(`${x}.length<=${check.maximum}`);
        break;
      case "length_equals":
        parts.push(`${x}.length===${check.length}`);
        break;
      case "includes":
        parts.push(
          check.position !== undefined
            ? `${x}.includes(${escapeString(check.includes)},${check.position})`
            : `${x}.includes(${escapeString(check.includes)})`,
        );
        break;
      case "starts_with":
        parts.push(`${x}.startsWith(${escapeString(check.prefix)})`);
        break;
      case "ends_with":
        parts.push(`${x}.endsWith(${escapeString(check.suffix)})`);
        break;
      case "string_format": {
        if (check.format === "email") {
          const v = g.regex("email", EMAIL_REGEX_SOURCE);
          parts.push(`${v}.test(${x})`);
        } else if (check.format === "url") {
          // URL validation uses try/catch — not a pure expression, ineligible
          return null;
        } else if (check.format === "uuid") {
          const pat = check.pattern ?? UUID_REGEX_SOURCE;
          const v = g.regex("uuid", pat);
          parts.push(`${v}.test(${x})`);
        } else if (check.format === "regex" && check.pattern) {
          const v = g.regex("re", check.pattern);
          parts.push(`${v}.test(${x})`);
        } else if (check.pattern) {
          const v = g.regex("re", check.pattern);
          parts.push(`${v}.test(${x})`);
        } else {
          // Unknown format without pattern — can't generate fast check
          return null;
        }
        break;
      }
    }
  }

  return parts.join("&&");
}
