import type { NullIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowNull(_ir: NullIR, g: SlowGen): string {
  return `${emit`
    if(${g.input}!==null){
      ${g.issues}.push({code:"invalid_type",expected:"null",input:${g.input},path:${g.path}});
    }
  `}\n`;
}

export function fastNull(_ir: NullIR, g: FastGen): string | null {
  return `${g.input}===null`;
}
