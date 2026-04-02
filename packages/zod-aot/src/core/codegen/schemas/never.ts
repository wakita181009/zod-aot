import type { NeverIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowNever(_ir: NeverIR, g: SlowGen): string {
  return `${emit`
    ${g.issues}.push({code:"invalid_type",expected:"never",input:${g.input},path:${g.path}});
  `}\n`;
}

export function fastNever(_ir: NeverIR, _g: FastGen): string | null {
  return "false";
}
