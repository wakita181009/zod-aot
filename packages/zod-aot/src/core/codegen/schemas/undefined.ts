import type { UndefinedIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowUndefined(_ir: UndefinedIR, g: SlowGen): string {
  return `${emit`
    if(${g.input}!==undefined){
      ${g.issues}.push({code:"invalid_type",expected:"undefined",input:${g.input},path:${g.path}});
    }
  `}\n`;
}

export function fastUndefined(_ir: UndefinedIR, g: FastGen): string | null {
  return `${g.input}===undefined`;
}
