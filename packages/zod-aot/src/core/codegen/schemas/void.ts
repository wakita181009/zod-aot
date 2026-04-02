import type { VoidIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowVoid(_ir: VoidIR, g: SlowGen): string {
  return `${emit`
    if(${g.input}!==undefined){
      ${g.issues}.push({code:"invalid_type",expected:"void",input:${g.input},path:${g.path}});
    }
  `}\n`;
}

export function fastVoid(_ir: VoidIR, g: FastGen): string | null {
  return `${g.input}===undefined`;
}
