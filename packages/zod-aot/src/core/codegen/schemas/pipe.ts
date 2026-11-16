import type { PipeIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";

/** Zod skips `out` once `in` reports an issue. */
export function slowPipe(ir: PipeIR, g: SlowGen): string {
  const before = g.temp("pb");
  const proceed = ir.passesUnrecognizedKeys
    ? `${g.issues}.slice(${before}).every(function(i){return i.code==="unrecognized_keys"})`
    : `${g.issues}.length===${before}`;
  return `var ${before}=${g.issues}.length;${g.visit(ir.in)}if(${proceed}){${g.visit(ir.out, { input: g.output, output: g.output })}}`;
}

export function fastPipe(ir: PipeIR, g: FastGen): string | null {
  // Only eligible if `out` is the same as `in` (non-transform pipe)
  // We check `in` only — if the pipe has a transform, `out` would be a fallback
  const inCheck = g.visit(ir.in);
  if (inCheck === null) return null;
  // Check if out schema is eligible (non-fallback)
  const outCheck = g.visit(ir.out);
  if (outCheck === null) return null;
  // Both in and out must pass
  return inCheck === "true" ? outCheck : outCheck === "true" ? inCheck : `${inCheck}&&${outCheck}`;
}
