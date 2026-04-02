import type { SymbolIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowSymbol(_ir: SymbolIR, g: SlowGen): string {
  return `${emit`
    if(typeof ${g.input}!=="symbol"){
      ${g.issues}.push({code:"invalid_type",expected:"symbol",input:${g.input},path:${g.path}});
    }
  `}\n`;
}

export function fastSymbol(_ir: SymbolIR, g: FastGen): string | null {
  return `typeof ${g.input}==="symbol"`;
}
