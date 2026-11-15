import type { CheckIR, CheckNumberFormat, NumberIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { checkPriority, escapeString, sortChecksPreservingEffects } from "../context.js";
import { emit } from "../emit.js";
import { invalidType, tooBig, tooSmall } from "../emit-issue.js";
import { refineCheck } from "./effect.js";

export function slowNumber(ir: NumberIR, g: SlowGen): string {
  let code = "";
  if (ir.coerce) {
    code += emit`try{${g.output}=Number(${g.input});}catch(_){}`;
  }
  code += emit`
    if(typeof ${g.input}!=="number"){
      ${invalidType(g, "number")}
    }else if(Number.isNaN(${g.input})){
      ${invalidType(g, "number", { extra: 'received:"NaN"' })}
    }else if(!Number.isFinite(${g.input})){
      ${invalidType(g, "number", { extra: 'received:"Infinity"' })}
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    let openBlocks = 0;
    for (const check of sortChecksPreservingEffects([...ir.checks])) {
      switch (check.kind) {
        case "greater_than":
          if (check.inclusive) {
            code += emit`
              if(${g.input}<${check.value}){
                ${tooSmall(g, check.value, "number", true)}
              }`;
          } else {
            code += emit`
              if(${g.input}<=${check.value}){
                ${tooSmall(g, check.value, "number", false)}
              }`;
          }
          break;
        case "less_than":
          if (check.inclusive) {
            code += emit`
              if(${g.input}>${check.value}){
                ${tooBig(g, check.value, "number", true)}
              }`;
          } else {
            code += emit`
              if(${g.input}>=${check.value}){
                ${tooBig(g, check.value, "number", false)}
              }`;
          }
          break;
        case "number_format": {
          // Checks after a format check that Zod aborts on (non-integer, and the
          // range too_big before Zod 4.3) must not run, so they are emitted
          // inside `if(!abort){` (closed below).
          const abortVar = g.temp("ab");
          code += `var ${abortVar}=false;${numberFormatCheck(check, g, abortVar)}if(!${abortVar}){`;
          openBlocks++;
          break;
        }
        case "multiple_of":
          code += emit`
            if(${g.input}%${check.value}!==0){
              ${g.issues}.push({code:"not_multiple_of",divisor:${check.value},origin:"number",input:${g.input},path:${g.path}});
            }`;
          break;
        case "refine_effect":
          code += refineCheck(check, g.input, g);
          break;
      }
    }
    code += "}".repeat(openBlocks + 1);
  }

  return `${code}\n`;
}

const FORMAT_RANGES: Record<"int32" | "uint32" | "float32", [string, string]> = {
  int32: ["-2147483648", "2147483647"],
  uint32: ["0", "4294967295"],
  float32: ["-3.4028234663852886e+38", "3.4028234663852886e+38"],
};

/**
 * Mirrors Zod's `$ZodCheckNumberFormat`. Assigns `abortVar=true` wherever Zod's
 * issue has `continue` unset, which makes Zod skip the remaining checks.
 * `check.legacy` (Zod < 4.3) omits `inclusive` and aborts on the range too_big.
 */
function numberFormatCheck(check: CheckNumberFormat, g: SlowGen, abortVar: string): string {
  const x = g.input;
  const inclusive = check.legacy ? "" : "inclusive:true,";
  const issue = (code: string, key: string, bound: string, origin: string, note = "") =>
    `${g.issues}.push({code:"${code}",${key}:${bound},origin:"${origin}",${inclusive}${note}input:${x},path:${g.path}});`;
  const range = (format: "int32" | "uint32" | "float32") => {
    const [min, max] = FORMAT_RANGES[format];
    return emit`
      if(${x}<${min}){${tooSmall(g, min, "number", true)}}
      if(${x}>${max}){${issue("too_big", "maximum", max, "number")}${check.legacy ? `${abortVar}=true;` : ""}}`;
  };

  if (check.format === "float64") return "";
  if (check.format === "float32") return range("float32");

  const note = 'note:"Integers must be within the safe integer range.",';
  return emit`
    if(!Number.isInteger(${x})){
      ${invalidType(g, "int", { extra: `format:${escapeString(check.format)}` })}${abortVar}=true;
    }else if(!Number.isSafeInteger(${x})){
      if(${x}>0){${issue("too_big", "maximum", "Number.MAX_SAFE_INTEGER", "int", note)}}
      else{${issue("too_small", "minimum", "Number.MIN_SAFE_INTEGER", "int", note)}}
    }${check.format === "safeint" ? "" : `else{${range(check.format)}}`}`;
}

export function fastNumber(ir: NumberIR, g: FastGen): string | null {
  if (ir.coerce) return null;

  const x = g.input;
  const parts: string[] = [`typeof ${x}==="number"`];
  const checks = ir.checks.filter((c): c is CheckIR => c.kind !== "refine_effect");

  // isSafeInteger, (x|0)===x, and (x>>>0)===x all return false for NaN and Infinity,
  // making explicit isNaN/isFinite guards redundant for integer formats.
  // Note: Math.fround(Infinity)===Infinity is true, so float32 still needs isFinite.
  const hasIntFormat = checks.some(
    (c) =>
      c.kind === "number_format" &&
      (c.format === "safeint" || c.format === "int32" || c.format === "uint32"),
  );
  if (!hasIntFormat) {
    parts.push(`!Number.isNaN(${x})`, `Number.isFinite(${x})`);
  }

  for (const check of checks.sort(checkPriority)) {
    switch (check.kind) {
      case "number_format":
        switch (check.format) {
          case "safeint":
            parts.push(`Number.isSafeInteger(${x})`);
            break;
          case "int32":
            parts.push(`(${x}|0)===${x}`);
            break;
          case "uint32":
            parts.push(`${x}>=0`, `${x}<=4294967295`, `(${x}>>>0)===${x}`);
            break;
          case "float32":
            parts.push(`Math.fround(${x})===${x}`);
            break;
          case "float64":
            // All finite numbers are valid float64
            break;
        }
        break;
      case "greater_than":
        parts.push(check.inclusive ? `${x}>=${check.value}` : `${x}>${check.value}`);
        break;
      case "less_than":
        parts.push(check.inclusive ? `${x}<=${check.value}` : `${x}<${check.value}`);
        break;
      case "multiple_of":
        parts.push(`${x}%${check.value}===0`);
        break;
      case "min_length":
      case "max_length":
      case "length_equals":
      case "string_format":
      case "includes":
      case "starts_with":
      case "ends_with":
        // String-only checks on a number schema — shouldn't happen, skip
        break;
    }
  }

  // Refine effect checks (appended last — run after cheap checks short-circuit)
  for (const check of ir.checks) {
    if (check.kind === "refine_effect") {
      parts.push(`(${check.source})(${x})`);
    }
  }

  return parts.join("&&");
}
