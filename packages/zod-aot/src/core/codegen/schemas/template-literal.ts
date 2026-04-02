import type { TemplateLiteralIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowTemplateLiteral(ir: TemplateLiteralIR, g: SlowGen): string {
  const regexVar = g.regex("tl", ir.pattern);
  return `${emit`
    if(typeof ${g.input}!=="string"){
      ${g.issues}.push({code:"invalid_type",expected:"string",input:${g.input},path:${g.path}});
    }else if(!${regexVar}.test(${g.input})){
      ${g.issues}.push({code:"invalid_format",format:"template_literal",pattern:${regexVar}.toString(),input:${g.input},path:${g.path}});
    }`}\n`;
}

export function fastTemplateLiteral(ir: TemplateLiteralIR, g: FastGen): string | null {
  const regexVar = g.regex("tl", ir.pattern);
  return `typeof ${g.input}==="string"&&${regexVar}.test(${g.input})`;
}
