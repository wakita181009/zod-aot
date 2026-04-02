import type { SchemaIR } from "../types.js";
import type { CodeGenContext, CodeGenResult } from "./context.js";
import { createFastGen, generateFast } from "./fast-path.js";
import { createSlowGen, generateSlow } from "./slow-path.js";

export type { CodeGenResult } from "./context.js";

/**
 * Generate optimized validation code from SchemaIR.
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
  const ctx: CodeGenContext = { preamble: [], counter: 0, fnName };

  // Fast Path: generate a boolean expression for eligible schemas
  const fg = createFastGen("input", ctx);
  const fastExpr = generateFast(ir, fg);

  const sg = createSlowGen("__data", "__data", "[]", "__issues", ctx);
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
    `delete __issues[__fi].input;`,
    `}`,
    `return{success:false,error:{issues:__issues}};`,
    `}`,
    `return{success:true,data:__data};`,
    `}`,
  );

  const functionDef = functionDefParts.join("\n");

  return { code, functionDef, fallbackCount: options?.fallbackCount ?? 0 };
}
