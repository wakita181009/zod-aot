import type { LiteralIR } from "../../types.js";

export function fastCheckLiteral(ir: LiteralIR, x: string): string {
  if (ir.values.length === 1) {
    return `${x}===${JSON.stringify(ir.values[0])}`;
  }
  // Wrap in parens — || has lower precedence than && in parent expressions
  return `(${ir.values.map((v) => `${x}===${JSON.stringify(v)}`).join("||")})`;
}
