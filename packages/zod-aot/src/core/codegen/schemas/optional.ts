import type { OptionalIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

/**
 * Whether the inner schema turns undefined into a value. Zod runs a default on
 * undefined even under .optional(), and a nested optional passes that through.
 * The extractor falls back for every other inner that Zod would run.
 */
function substitutesUndefined(ir: SchemaIR): boolean {
  if (ir.type === "default") return true;
  return ir.type === "optional" && substitutesUndefined(ir.inner);
}

export function slowOptional(ir: SchemaIR & { type: "optional" }, g: SlowGen): string {
  if (substitutesUndefined(ir.inner)) return g.visit(ir.inner);
  return `${emit`
    if(${g.input}!==undefined){
      ${g.visit(ir.inner)}
    }
  `}\n`;
}

export function fastOptional(ir: OptionalIR, g: FastGen): string | null {
  const inner = g.visit(ir.inner);
  if (inner === null) return null;
  // The default rejects undefined here, leaving the substitution to the slow path.
  if (substitutesUndefined(ir.inner)) return inner;
  return `(${g.input}===undefined||(${inner}))`;
}
