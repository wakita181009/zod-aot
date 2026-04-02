import type { SchemaIR } from "../types.js";
import type { CodeGenContext, CodeGenResult } from "./context.js";
import { createFastGen, generateFast } from "./fast-path.js";
import { createSlowGen, generateSlow } from "./slow-path.js";
import { generateWarmPath } from "./warm-path.js";

export type { CodeGenResult } from "./context.js";

/**
 * Generate optimized validation code from SchemaIR.
 *
 * Three-phase validation:
 *   1. Fast Path — pure boolean guard, zero allocation (pure schemas only)
 *   2. Warm Path — probe (boolean) + materialize (minimal allocation for coerce/default/catch)
 *   3. Slow Path — full error-collecting validation
 *
 * - `code`: preamble declarations (Sets, RegExps, etc.) — deterministic for the same IR
 * - `functionDef`: full function expression string referencing preamble vars via closure
 *
 * Usage: `new Function(code + "\nreturn " + functionDef + ";")()`
 */
export function generateValidator(
  ir: SchemaIR,
  name: string,
  options?: { fallbackCount?: number },
): CodeGenResult {
  const fnName = `safeParse_${name}`;
  const isFnName = `is_${name}`;
  const ctx: CodeGenContext = { preamble: [], counter: 0, fnName };

  // Phase 1: Fast Path — pure boolean expression for eligible schemas
  const fg = createFastGen("input", ctx);
  const fastExpr = generateFast(ir, fg);

  // Probe expression for is(): ignores coerce/mutation constraints.
  // Falls back to fastExpr for non-mutation schemas.
  let isExpr: string | null = fastExpr;
  if (fastExpr === null) {
    const probeFg = createFastGen("input", ctx, { probeMode: true });
    isExpr = generateFast(ir, probeFg);
  }

  // Phase 2: Warm Path — handle mutation schemas where inner has a fast path.
  const warmPath = generateWarmPath(ir, ctx);

  // Phase 3: Slow Path — full error-collecting validation
  const sg = createSlowGen("__data", "__data", "[]", "__issues", ctx);
  const slowCode = generateSlow(ir, sg);

  const code = ["/* zod-aot */", ...ctx.preamble].join("\n");

  // ─── is() function: pure boolean, equivalent to safeParse(input).success ───
  const isFunctionDef =
    isExpr !== null
      ? `function ${isFnName}(input){return ${isExpr};}`
      : `function ${isFnName}(input){return ${fnName}(input).success;}`;

  // ─── safeParse() function ──────────────────────────────────────────────────
  const functionDefParts = [`function ${fnName}(input){`];

  // Emit fast path guard if eligible (pure schemas — no mutations)
  if (fastExpr !== null && fastExpr !== "true") {
    functionDefParts.push(`if(${fastExpr}){return{success:true,data:input};}`);
  } else if (warmPath !== null) {
    // Warm path: default/catch with fast-path-eligible inner.
    // Returns early for valid inputs without allocating issues array.
    functionDefParts.push(warmPath);
  } else if (fastExpr === "true") {
    // Schema always succeeds (any/unknown) — skip slow path entirely
    functionDefParts.push(`return{success:true,data:input};`);
    functionDefParts.push(`}`);
    return {
      code,
      functionDef: functionDefParts.join("\n"),
      isFunctionDef,
      fallbackCount: options?.fallbackCount ?? 0,
    };
  }

  functionDefParts.push(
    `var __issues=[];`,
    `var __data=input;`,
    slowCode,
    `if(__issues.length>0){`,
    `for(var __fi=0;__fi<__issues.length;__fi++){`,
    `if(typeof __msg==="function")__issues[__fi].message=__msg(__issues[__fi]);`,
    `__issues[__fi].input=undefined;`,
    `}`,
    `return{success:false,error:new __ZodError(__issues)};`,
    `}`,
    `return{success:true,data:__data};`,
    `}`,
  );

  const functionDef = functionDefParts.join("\n");

  return { code, functionDef, isFunctionDef, fallbackCount: options?.fallbackCount ?? 0 };
}
