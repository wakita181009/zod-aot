import type { BooleanIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowBoolean(ir: BooleanIR, g: SlowGen): string {
  let code = "";
  if (ir.coerce) {
    code += emit`${g.output}=Boolean(${g.input});`;
  }
  code += emit`
    if(typeof ${g.input}!=="boolean"){
      ${g.issues}.push({code:"invalid_type",expected:"boolean",input:${g.input},path:${g.path}});
    }
  `;
  return `${code}\n`;
}

export function fastBoolean(ir: BooleanIR, g: FastGen): string | null {
  if (ir.coerce) return null;
  return `typeof ${g.input}==="boolean"`;
}
