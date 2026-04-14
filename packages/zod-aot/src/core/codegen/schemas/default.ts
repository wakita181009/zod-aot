import type { DefaultIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowDefault(ir: DefaultIR, g: SlowGen): string {
  const defaultExpr =
    "fallbackIndex" in ir
      ? `__fb[${ir.fallbackIndex}]._zod.def.defaultValue`
      : JSON.stringify(ir.defaultValue);
  return `${emit`
    if(${g.input}===undefined){
      ${g.output}=${defaultExpr};
    }
  `}\n${g.visit(ir.inner, { input: g.output, output: g.output })}`;
}

export function fastDefault(ir: DefaultIR, g: FastGen): string | null {
  const inner = g.visit(ir.inner);
  if (inner === null) return null;
  return `(${g.input}!==undefined&&(${inner}))`;
}
