import type { CheckIR, NumberIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { checkPriority, sortChecksPreservingEffects } from "../context.js";
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
        case "number_format":
          if (check.format === "safeint") {
            code += emit`
              if(!Number.isSafeInteger(${g.input})){
                ${invalidType(g, "int", { extra: 'format:"safeint"' })}
              }`;
          } else if (check.format === "int32") {
            code += emit`
              if(!Number.isInteger(${g.input})){
                ${invalidType(g, "int", { extra: 'format:"int32"' })}
              }else if(${g.input}<-2147483648){
                ${tooSmall(g, -2147483648, "number", true)}
              }else if(${g.input}>2147483647){
                ${tooBig(g, 2147483647, "number", true)}
              }`;
          } else if (check.format === "uint32") {
            code += emit`
              if(!Number.isInteger(${g.input})){
                ${invalidType(g, "int", { extra: 'format:"uint32"' })}
              }else if(${g.input}<0){
                ${tooSmall(g, 0, "number", true)}
              }else if(${g.input}>4294967295){
                ${tooBig(g, 4294967295, "number", true)}
              }`;
          } else if (check.format === "float32") {
            code += emit`
              if(${g.input}<-3.4028234663852886e+38){
                ${tooSmall(g, "-3.4028234663852886e+38", "number", true)}
              }else if(${g.input}>3.4028234663852886e+38){
                ${tooBig(g, "3.4028234663852886e+38", "number", true)}
              }`;
          }
          // float64 range is [-Number.MAX_VALUE, Number.MAX_VALUE], already covered by the isFinite check above
          break;
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
    code += `}`;
  }

  return `${code}\n`;
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
