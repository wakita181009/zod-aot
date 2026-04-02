import type { EnumIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { ENUM_INLINE_THRESHOLD, escapeString } from "../context.js";
import { emit } from "../emit.js";

export function slowEnum(ir: EnumIR, g: SlowGen): string {
  if (ir.values.length <= ENUM_INLINE_THRESHOLD) {
    // Inline equality checks for small enums (avoids Set allocation in preamble)
    const condition = ir.values.map((v) => `${g.input}!==${escapeString(v)}`).join("&&");
    return `${emit`
      if(${condition}){
        ${g.issues}.push({code:"invalid_value",values:${JSON.stringify(ir.values)},input:${g.input},path:${g.path}});
      }
    `}\n`;
  }
  const setVar = g.set("enum", ir.values);
  return `${emit`
    if(!${setVar}.has(${g.input})){
      ${g.issues}.push({code:"invalid_value",values:${JSON.stringify(ir.values)},input:${g.input},path:${g.path}});
    }
  `}\n`;
}

export function fastEnum(ir: EnumIR, g: FastGen): string {
  const x = g.input;
  if (ir.values.length <= ENUM_INLINE_THRESHOLD) {
    // Inline equality checks for small enums, wrapped in parens for precedence safety
    return `(${ir.values.map((v) => `${x}===${escapeString(v)}`).join("||")})`;
  }
  // Use Set for larger enums
  const setVar = g.temp("enumSet");
  g.ctx.preamble.push(`var ${setVar}=new Set(${JSON.stringify(ir.values)});`);
  return `${setVar}.has(${x})`;
}
