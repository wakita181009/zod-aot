import { ZodRealError } from "zod";
import type { CodeGenContext } from "#src/core/codegen/context.js";
import { createFastGen, generateFast } from "#src/core/codegen/fast-path.js";
import { generateValidator } from "#src/core/codegen/index.js";
import { FIN_DECL } from "#src/core/iife.js";
import type { SchemaIR } from "#src/core/types.js";

// __msg intentionally undefined: codegen tests verify raw issues, not locale-transformed messages.
const __fin = new Function("__msg", "__ZodError", `${FIN_DECL}; return __fin;`)(
  undefined,
  ZodRealError,
);

/**
 * Helper: generate code from IR, compile it, and return the safeParse function.
 */
export function compileIR(
  ir: SchemaIR,
  name = "test",
  refSchemas?: unknown[],
): (input: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } {
  const result = generateValidator(ir, name, {
    refCount: refSchemas?.length ?? 0,
  });
  const fn =
    refSchemas && refSchemas.length > 0
      ? new Function("__ZodError", "__fin", "__rf", `${result.code}\nreturn ${result.functionDef};`)
      : new Function("__ZodError", "__fin", `${result.code}\nreturn ${result.functionDef};`);
  return (
    refSchemas && refSchemas.length > 0
      ? fn(ZodRealError, __fin, refSchemas)
      : fn(ZodRealError, __fin)
  ) as (input: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { issues: unknown[] };
  };
}

/**
 * Helper: compile a fast-check expression from IR and return a boolean function.
 * Returns null if the schema is not eligible for fast-check.
 */
export function compileFastCheck(ir: SchemaIR): ((input: unknown) => boolean) | null {
  const ctx: CodeGenContext = {
    preamble: [],
    counter: 0,
    fnName: "test",
    regexCache: new Map(),
    mode: "inline",
    usedHelpers: new Set(),
  };
  const g = createFastGen("input", ctx);
  const expr = generateFast(ir, g);
  if (expr === null) return null;
  if (expr === "true") return () => true;
  if (expr === "false") return () => false;
  const code = [...ctx.preamble, `return function(input){return ${expr};}`].join("\n");
  return new Function(code)() as (input: unknown) => boolean;
}
