import type { SchemaIR } from "../../types.js";
import type { SlowGen } from "../context.js";

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
