import type { SchemaIR } from "../../types.js";
import type { SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowDefault(ir: SchemaIR & { type: "default" }, g: SlowGen): string {
  const defaultValueStr = JSON.stringify(ir.defaultValue);
  return `${emit`
    if(${g.input}===undefined){
      ${g.output}=${defaultValueStr};
    }
  `}\n${g.visit(ir.inner, { input: g.output, output: g.output })}`;
}
