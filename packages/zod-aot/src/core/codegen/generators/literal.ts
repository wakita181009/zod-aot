import type { SchemaIR } from "../../types.js";
import { escapeString } from "../context.js";
import { emit } from "../emit.js";

export function generateLiteralValidation(
  ir: SchemaIR & { type: "literal" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  if (ir.values.length === 1) {
    const v = ir.values[0];
    let cond: string;
    if (v === null) {
      cond = `${inputExpr}!==null`;
    } else if (typeof v === "string") {
      cond = `${inputExpr}!==${escapeString(v)}`;
    } else {
      cond = `${inputExpr}!==${String(v)}`;
    }
    return `${emit`
      if(${cond}){
        ${issuesVar}.push({code:"invalid_value",values:${JSON.stringify([v])},input:${inputExpr},path:${pathExpr}});
      }
    `}\n`;
  }

  const valueChecks = ir.values
    .map((v) => {
      if (v === null) return `${inputExpr}===null`;
      if (typeof v === "string") return `${inputExpr}===${escapeString(v)}`;
      return `${inputExpr}===${String(v)}`;
    })
    .join("||");

  return `${emit`
    if(!(${valueChecks})){
      ${issuesVar}.push({code:"invalid_value",values:${JSON.stringify(ir.values)},input:${inputExpr},path:${pathExpr}});
    }
  `}\n`;
}
