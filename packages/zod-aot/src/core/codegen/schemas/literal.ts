import type { LiteralIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { escapeString } from "../context.js";
import { emit } from "../emit.js";
import { invalidValue } from "../emit-issue.js";

export function slowLiteral(ir: LiteralIR, g: SlowGen): string {
  if (ir.values.length === 1) {
    const v = ir.values[0];
    let cond: string;
    if (v === null) {
      cond = `${g.input}!==null`;
    } else if (typeof v === "string") {
      cond = `${g.input}!==${escapeString(v)}`;
    } else {
      cond = `${g.input}!==${String(v)}`;
    }
    return emit`
      if(${cond}){
        ${invalidValue(g, JSON.stringify([v]))}
      }
    `;
  }

  const valueChecks = ir.values
    .map((v) => {
      if (v === null) return `${g.input}===null`;
      if (typeof v === "string") return `${g.input}===${escapeString(v)}`;
      return `${g.input}===${String(v)}`;
    })
    .join("||");

  return emit`
    if(!(${valueChecks})){
      ${invalidValue(g, JSON.stringify(ir.values))}
    }
  `;
}

export function fastLiteral(ir: LiteralIR, g: FastGen): string {
  const x = g.input;
  if (ir.values.length === 1) {
    return `${x}===${JSON.stringify(ir.values[0])}`;
  }
  // Wrap in parens — || has lower precedence than && in parent expressions
  return `(${ir.values.map((v) => `${x}===${JSON.stringify(v)}`).join("||")})`;
}
