import type { StringIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { checkPriority, EMAIL_REGEX_SOURCE, escapeString, UUID_REGEX_SOURCE } from "../context.js";

export function fastCheckString(ir: StringIR, x: string, ctx: CodeGenContext): string | null {
  const parts: string[] = [`typeof ${x}==="string"`];

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
        if (check.format === "email") {
          const v = `__re_email_${ctx.counter++}`;
          ctx.preamble.push(`var ${v}=new RegExp(${escapeString(EMAIL_REGEX_SOURCE)});`);
          parts.push(`${v}.test(${x})`);
        } else if (check.format === "url") {
          // URL validation uses try/catch — not a pure expression, ineligible
          return null;
        } else if (check.format === "uuid") {
          const v = `__re_uuid_${ctx.counter++}`;
          const pat = check.pattern ?? UUID_REGEX_SOURCE;
          ctx.preamble.push(`var ${v}=new RegExp(${escapeString(pat)});`);
          parts.push(`${v}.test(${x})`);
        } else if (check.format === "regex" && check.pattern) {
          const v = `__re_${ctx.counter++}`;
          ctx.preamble.push(`var ${v}=new RegExp(${escapeString(check.pattern)});`);
          parts.push(`${v}.test(${x})`);
        } else if (check.pattern) {
          const v = `__re_${ctx.counter++}`;
          ctx.preamble.push(`var ${v}=new RegExp(${escapeString(check.pattern)});`);
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
