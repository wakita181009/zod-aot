import type { CatchIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";

export function slowCatch(ir: SchemaIR & { type: "catch" }, g: SlowGen): string {
  const defaultStr = ir.defaultValue === undefined ? "undefined" : JSON.stringify(ir.defaultValue);
  const tempIssues = g.temp("ci");
  return [
    `var ${tempIssues}=[];`,
    g.visit(ir.inner, { issues: tempIssues }),
    `if(${tempIssues}.length>0){${g.output}=${defaultStr};}`,
    "",
  ].join("\n");
}

export function fastCatch(ir: CatchIR, g: FastGen): string | null {
  return g.visit(ir.inner);
}
