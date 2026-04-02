/**
 * Warm Path: generates early-return code for mutation schemas (default, catch)
 * where the inner schema is Fast Path eligible.
 *
 * Sits between Fast Path and Slow Path in generateValidator():
 *   fast path guard → warm path guard → slow path (with issues)
 *
 * Returns null if no warm path optimization is possible.
 */

import type { CatchIR, DefaultIR, SchemaIR } from "../types.js";
import type { CodeGenContext } from "./context.js";
import { createFastGen, generateFast } from "./fast-path.js";

export function generateWarmPath(ir: SchemaIR, ctx: CodeGenContext): string | null {
  if (ir.type === "default") {
    return generateDefaultWarm(ir, ctx);
  }
  if (ir.type === "catch") {
    return generateCatchWarm(ir, ctx);
  }
  return null;
}

function generateDefaultWarm(ir: DefaultIR, ctx: CodeGenContext): string | null {
  const innerFg = createFastGen("input", ctx);
  const innerFastExpr = generateFast(ir.inner, innerFg);
  if (innerFastExpr === null) return null;

  // JSON.stringify loses type fidelity for Date, Set, Map, etc.
  // Only emit warm path for JSON-safe default values.
  if (ir.defaultValue instanceof Date) return null;

  const defaultStr = ir.defaultValue === undefined ? "undefined" : JSON.stringify(ir.defaultValue);
  const lines: string[] = [];

  // undefined → return default value immediately
  lines.push(`if(input===undefined){return{success:true,data:${defaultStr}};}`);

  // inner fast path passes → return input as-is
  if (innerFastExpr !== "true") {
    lines.push(`if(${innerFastExpr}){return{success:true,data:input};}`);
  } else {
    lines.push(`return{success:true,data:input};`);
  }

  return lines.join("\n");
}

function generateCatchWarm(ir: CatchIR, ctx: CodeGenContext): string | null {
  const innerFg = createFastGen("input", ctx);
  const innerFastExpr = generateFast(ir.inner, innerFg);
  if (innerFastExpr === null) return null;

  const catchStr = ir.defaultValue === undefined ? "undefined" : JSON.stringify(ir.defaultValue);

  // inner fast path passes → return input; fails → return catch value
  if (innerFastExpr === "true") {
    return `return{success:true,data:input};`;
  }
  return [
    `if(${innerFastExpr}){return{success:true,data:input};}`,
    `return{success:true,data:${catchStr}};`,
  ].join("\n");
}
