import { assertNever } from "../../assert-never.js";
import type { CheckStringFormat, StringIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { checkPriority, escapeString, sortChecksPreservingEffects } from "../context.js";
import { emit } from "../emit.js";
import { invalidFormat, invalidType, tooBig, tooSmall } from "../emit-issue.js";
import { EMAIL_REGEX_SOURCE, UUID_REGEX_SOURCE } from "../well-known-regex.js";
import { refineCheck } from "./effect.js";

export function slowString(ir: StringIR, g: SlowGen): string {
  let code = "";
  if (ir.coerce) {
    code += emit`try{${g.output}=String(${g.input});}catch(_){}`;
  }
  code += emit`
    if(typeof ${g.input}!=="string"){
      ${invalidType(g, "string")}
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of sortChecksPreservingEffects([...ir.checks])) {
      switch (check.kind) {
        case "min_length":
          code += emit`
            if(${g.input}.length<${check.minimum}){
              ${tooSmall(g, check.minimum, "string", true)}
            }`;
          break;
        case "max_length":
          code += emit`
            if(${g.input}.length>${check.maximum}){
              ${tooBig(g, check.maximum, "string", true)}
            }`;
          break;
        case "length_equals":
          code += emit`
            if(${g.input}.length<${check.length}){
              ${tooSmall(g, check.length, "string", true, { exact: true })}
            }else if(${g.input}.length>${check.length}){
              ${tooBig(g, check.length, "string", true, { exact: true })}
            }`;
          break;
        case "includes":
          code += emit`
            if(!${g.input}.includes(${escapeString(check.includes)}${check.position !== undefined ? `,${check.position}` : ""})){
              ${invalidFormat(g, "includes", { extra: `includes:${escapeString(check.includes)}` })}
            }`;
          break;
        case "starts_with":
          code += emit`
            if(!${g.input}.startsWith(${escapeString(check.prefix)})){
              ${invalidFormat(g, "starts_with", { extra: `prefix:${escapeString(check.prefix)}` })}
            }`;
          break;
        case "ends_with":
          code += emit`
            if(!${g.input}.endsWith(${escapeString(check.suffix)})){
              ${invalidFormat(g, "ends_with", { extra: `suffix:${escapeString(check.suffix)}` })}
            }`;
          break;
        case "refine_effect":
          code += refineCheck(check, g.input, g);
          break;
        case "overwrite_effect":
          // Slow-path child generators always receive the same lvalue for input
          // and output, so later checks observe the rewritten value as in Zod.
          code += `${g.output}=(${check.source})(${g.input});`;
          break;
        case "string_format": {
          if (check.format === "url") {
            // Zod validates the trimmed value and, on success, outputs it trimmed.
            const trimmed = g.temp("url");
            code += emit`
              var ${trimmed}=${g.input}.trim();
              try{new URL(${trimmed});${g.output}=${trimmed};}catch(e){
                ${invalidFormat(g, "url")}
              }`;
            break;
          }
          const regexVar = formatRegex(check, g);
          if (regexVar === null) break;
          code += emit`
            if(!${regexVar}.test(${g.input})){
              ${invalidFormat(g, { expr: escapeString(check.format) }, { extra: `pattern:${regexVar}.toString(),origin:"string"` })}
            }`;
          break;
        }
        default:
          assertNever(check);
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}

/**
 * Resolve the regex variable for a pattern-based format check, or null when the
 * IR carries no pattern (hand-built IR in tests; the extractor always sets one).
 */
function formatRegex(check: CheckStringFormat, g: SlowGen | FastGen): string | null {
  if (check.format === "email")
    return g.regex("email", check.pattern ?? EMAIL_REGEX_SOURCE, check.flags);
  if (check.format === "uuid")
    return g.regex("uuid", check.pattern ?? UUID_REGEX_SOURCE, check.flags);
  if (check.pattern === undefined) return null;
  return g.regex(check.format === "regex" ? "re" : "str", check.pattern, check.flags);
}

export function fastString(ir: StringIR, g: FastGen): string | null {
  // The fast path returns the input as-is, so anything that rewrites the value
  // (coerce here, overwrite effects and url trimming below) is ineligible.
  if (ir.coerce) return null;

  const x = g.input;
  const parts: string[] = [`typeof ${x}==="string"`];

  // Effects have no priority, so refines sort last and run after cheap checks.
  for (const check of [...ir.checks].sort(checkPriority)) {
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
        if (check.format === "url") return null;
        const v = formatRegex(check, g);
        if (v === null) return null;
        parts.push(`${v}.test(${x})`);
        break;
      }
      case "refine_effect":
        parts.push(`(${check.source})(${x})`);
        break;
      case "overwrite_effect":
        return null;
      default:
        assertNever(check);
    }
  }

  return parts.join("&&");
}
