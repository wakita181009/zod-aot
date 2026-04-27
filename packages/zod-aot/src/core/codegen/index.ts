import type { SchemaIR } from "../types.js";
import type { CodeGenContext, CodeGenResult, CodegenMode } from "./context.js";
import { createFastGen, generateFast } from "./fast-path.js";
import { createSlowGen, generateSlow } from "./slow-path.js";

export type { CodeGenResult } from "./context.js";

export interface GenerateValidatorOptions {
  refCount?: number;
  /** Codegen output mode. Defaults to "inline". */
  mode?: CodegenMode;
}

/**
 * Generate optimized validation code from SchemaIR.
 *
 * - `code`: preamble declarations (Sets, RegExps, etc.) — deterministic for the same IR
 * - `functionDef`: full function expression string referencing preamble vars via closure
 * - `usedHelpers`: helper names from "virtual:zod-aot/runtime" referenced (lean mode only)
 *
 * Usage: `new Function(code + "\nreturn " + functionDef + ";")()`
 */
export function generateValidator(
  ir: SchemaIR,
  name: string,
  options?: GenerateValidatorOptions,
): CodeGenResult {
  const fnName = `safeParse_${name}`;
  const mode: CodegenMode = options?.mode ?? "inline";
  const ctx: CodeGenContext = {
    preamble: [],
    counter: 0,
    fnName,
    regexCache: new Map(),
    mode,
    usedHelpers: new Set(),
  };

  // Fast Path: generate a boolean expression for eligible schemas
  const fg = createFastGen("input", ctx);
  const fastExpr = generateFast(ir, fg);

  const sg = createSlowGen("_d", "_d", "[]", "_e", ctx);
  const slowCode = generateSlow(ir, sg);

  const code = ["/* zod-aot */", ...ctx.preamble].join("\n");

  const functionDefParts = [`function ${fnName}(input){`];

  // Prepend fast path guard if eligible
  if (fastExpr !== null && fastExpr !== "true") {
    functionDefParts.push(`if(${fastExpr}){return{success:true,data:input};}`);
  } else if (fastExpr === "true") {
    // Schema always succeeds (any/unknown) — skip slow path entirely
    functionDefParts.push(`return{success:true,data:input};`);
    functionDefParts.push(`}`);
    return {
      code,
      functionDef: functionDefParts.join("\n"),
      refCount: options?.refCount ?? 0,
      usedHelpers: ctx.usedHelpers,
    };
  }

  functionDefParts.push(`var _e=[];`, `var _d=input;`, slowCode, `return __fin(_e,_d);`, `}`);

  const functionDef = functionDefParts.join("\n");

  return {
    code,
    functionDef,
    refCount: options?.refCount ?? 0,
    usedHelpers: ctx.usedHelpers,
  };
}
